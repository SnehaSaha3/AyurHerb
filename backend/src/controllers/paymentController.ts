import { Response } from "express";
import axios from "axios";
import Order from "../models/order";
import Company from "../models/company";
import Farmer from "../models/farmer"; 
import { createRazorpayOrder, verifyPaymentSignature } from "../services/paymentService";
import { generateQrToken, generateQrCodeDataUrl } from "../services/qrService";
import { computeOrderFees } from "../services/feeService";
import { decrementFarmerStock } from "../services/farmerStock";
import { logEscrowFundedOnChain } from "./orderController";
import { emitToUser } from "../socket";

const AGENTS_URL = process.env.AGENTS_URL || "http://localhost:8001";

/**
 * STEP 1 — Company clicks "Pay" on an order in `awaiting_payment` status.
 * Creates a Razorpay TEST MODE order and hands back what the frontend
 * Checkout widget needs. No money moves yet.
 */
export async function createPaymentOrder(req: any, res: Response) {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "awaiting_payment") {
      return res.status(409).json({ error: `Order is in status '${order.status}', not payable` });
    }

    // Fees computed server-side from real order data — never accept
    // fee amounts from the client. order.amount is the crop subtotal,
    // unchanged in meaning from before this redesign.
    const fees = computeOrderFees(order.amount, order.quantity);
    order.fees = fees;

    const { razorpayOrderId, amountPaise, keyId } = await createRazorpayOrder(
      fees.grandTotal,
      order.id
    );

    order.escrow.razorpayOrderId = razorpayOrderId;
    order.escrow.amountPaidPaise = amountPaise;
    order.escrow.currency = "INR";
    order.status = "payment_processing";
    await order.save();

    res.json({
      success: true,
      razorpayOrderId,
      amountPaise,
      keyId, // frontend needs this to open Checkout — it's the public key, safe to expose
      currency: "INR",
      breakdown: fees, // frontend shows company the full breakdown before they pay
    });
  } catch (err: any) {
    console.error("createPaymentOrder error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}

/**
 * STEP 2 — Frontend Checkout returns razorpay_payment_id + signature
 * after the (test-mode) payment completes. This verifies it, marks
 * escrow funded, logs the hash on-chain, runs the fraud agent, and
 * either auto-approves (low risk) or routes to admin review.
 */
export async function verifyPayment(req: any, res: Response) {
  try {
    const { razorpayPaymentId, razorpaySignature } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!order.escrow.razorpayOrderId) {
      return res.status(400).json({ error: "No payment order was created for this order" });
    }

    const valid = verifyPaymentSignature(
      order.escrow.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    if (!valid) {
      return res.status(400).json({ error: "Payment signature verification failed" });
    }

    // Stock is reserved HERE — at confirmed payment, not at order
    // creation. This is the atomic guard against overselling; see
    // farmerStockService.ts for why. If this fails, money was already
    // captured by Razorpay (test mode) — in a live integration this
    // is exactly where you'd trigger an automatic refund. Flagging
    // that as a TODO rather than building refund flow speculatively.
    const stockResult = await decrementFarmerStock(
      order.farmerId.toString(),
      order.cropId,
      order.quantity
    );
    if (!stockResult.success) {
      order.status = "rejected";
      await order.save();
      // TODO: trigger Razorpay refund here once you're off test mode —
      // razorpay.payments.refund(razorpayPaymentId)
      return res.status(409).json({
        error: stockResult.reason,
        note: "Payment was captured but stock could not be reserved — refund required in a live integration",
      });
    }

    order.escrow.razorpayPaymentId = razorpayPaymentId;
    order.escrow.razorpaySignature = razorpaySignature;
    order.escrow.fundedAt = new Date();
    order.status = "escrow_funded";

    // Log ONLY the hash on-chain — see hashEscrowPayload for what's included.
    const { txHash } = await logEscrowFundedOnChain({
      orderId: order.id,
      razorpayOrderId: order.escrow.razorpayOrderId,
      razorpayPaymentId,
      amountPaidPaise: order.escrow.amountPaidPaise!,
    });
    order.escrow.escrowChainTxHash = txHash;

    // ── Fraud agent ────────────────────────────────────────────────
    const [company, farmer] = await Promise.all([
      Company.findById(order.companyId),
      Farmer.findById(order.farmerId),
    ]);

    const fraudRes = await axios.post(`${AGENTS_URL}/escrow/check-fraud`, {
      orderId: order.id,
      companyId: order.companyId.toString(),
      farmerId: order.farmerId.toString(),
      orderAmount: order.amount,
      companyVerificationPassed: order.verification.passed,
      stockCheckPassed: order.stockCheck.passed,
      // ADAPT: wire these to real counts once you're tracking order/dispute
      // history per company/farmer. Defaulting to 0 just means "treat as
      // new party" until that data exists — safe, not silently wrong.
      companyPastOrderCount: company?.get("pastOrderCount") ?? 0,
      companyDisputeCount: company?.get("disputeCount") ?? 0,
      farmerPastOrderCount: farmer?.get("pastOrderCount") ?? 0,
      farmerDisputeCount: farmer?.get("disputeCount") ?? 0,
    });

    order.fraudCheck = { ...fraudRes.data, checkedAt: new Date() };

    if (fraudRes.data.requiresAdminReview) {
      order.status = "pending_admin_review";
      order.adminReview = { decision: "pending" };
      await order.save();

      // Admin doesn't have a socket room yet — there's no adminId path
      // in socketService's JWT decode, only farmerId/companyId. Real-time
      // "new item in review queue" notification needs admin auth built
      // first (tracked in GAP_AUDIT.md). Admin sees it by polling/loading
      // GET /admin/review-queue for now, not via push.

      return res.json({ success: true, order, routedToAdmin: true });
    }

    // Low risk — auto-approved, straight to invoice + first tranche.
    await order.save();
    const result = await generateInvoiceAndReleaseShipmentTranche(order);
    res.json({ success: true, order: result, routedToAdmin: false });
  } catch (err: any) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}

/**
 * Shared by both the auto-approve path and the admin-approve path:
 * generates the invoice + QR, releases the shipment tranche (10%),
 * notifies both parties. Broken out so admin approval doesn't
 * duplicate this logic.
 */
export async function generateInvoiceAndReleaseShipmentTranche(order: any) {
  const [company, farmer] = await Promise.all([
    Company.findById(order.companyId),
    Farmer.findById(order.farmerId),
  ]);

  const SHIPMENT_PERCENT = 10;
  const DELIVERY_PERCENT = 90;
  const invoiceNumber = `AH-INV-${order.id.slice(-8).toUpperCase()}`;

  // Generate the QR token/URL FIRST — the invoice PDF embeds this same
  // verify URL, so the QR printed on the farmer's packs and the QR
  // inside the invoice PDF point at the exact same place.
  const qrToken = generateQrToken();
  const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:8000";
  const verifyUrl = `${baseUrl}/public/verify/${order.id}/${qrToken}`;
  const qrCodeDataUrl = await generateQrCodeDataUrl(order.id, qrToken);

  const invoiceRes = await axios.post(`${AGENTS_URL}/escrow/generate-invoice`, {
    orderId: order.id,
    invoiceNumber,
    companyName: company?.name,
    companyGstNumber: order.verification.gstNumber,
    farmerName: farmer?.name,
    farmerLocation: farmer?.address ?? "N/A",
    cropName: order.cropName,
    quantity: order.quantity,
    unit: "kg",
    cropSubtotal: order.amount,
    platformFeePercent: order.fees.platformFeePercent,
    platformFeeAmount: order.fees.platformFeeAmount,
    transportationFeeAmount: order.fees.transportationFeeAmount,
    gstOnFeesPercent: order.fees.gstOnFeesPercent,
    gstOnFeesAmount: order.fees.gstOnFeesAmount,
    grandTotal: order.fees.grandTotal,
    shipmentTranchePercent: SHIPMENT_PERCENT,
    deliveryTranchePercent: DELIVERY_PERCENT,
    verifyUrl,
  });

  order.invoice = {
    invoiceNumber,
    invoiceText: invoiceRes.data.invoiceText,
    invoicePdfBase64: invoiceRes.data.pdfBase64,
    generatedAt: new Date(),
    qrToken,
    qrCodeDataUrl,
  };

  order.tranches = [
    { type: "shipment", percent: SHIPMENT_PERCENT, amount: order.amount * (SHIPMENT_PERCENT / 100), status: "pending" },
    { type: "delivery", percent: DELIVERY_PERCENT, amount: order.amount * (DELIVERY_PERCENT / 100), status: "pending" },
  ];

  await releaseTranche(order, "shipment");
  order.status = "shipment_released";
  await order.save();

  emitToUser(order.farmerId.toString(), "farmer", "order:payment_received", {
    orderId: order.id,
    message: `Payment received. ${SHIPMENT_PERCENT}% transferred to your account — start shipment.`,
    invoiceNumber,
  });

  emitToUser(order.companyId.toString(), "company", "order:invoice_ready", {
    orderId: order.id,
    invoiceNumber,
  });

  return order;
}

/**
 * Fires one tranche: logs the hash on-chain, updates the subdocument,
 * marks it released. Called for "shipment" right after invoice
 * generation, and separately for "delivery" once the company/admin
 * confirms delivery (wire that trigger to your existing delivery-
 * confirmation flow if you have one).
 */
export async function releaseTranche(order: any, type: "shipment" | "delivery") {
  const tranche = order.tranches.find((t: any) => t.type === type);
  if (!tranche || tranche.status === "released") return order;

  const { logTrancheReleasedOnChain } = await import("./orderController");
  const { txHash } = await logTrancheReleasedOnChain({
    orderId: order.id,
    type,
    percent: tranche.percent,
    amount: tranche.amount,
  });

  tranche.status = "released";
  tranche.releasedAt = new Date();
  tranche.chainTxHash = txHash;

  return order;
}