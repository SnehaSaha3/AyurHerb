import { Response } from "express";
import axios from "axios";
import Order from "../models/order";
import Company from "../models/company";
import Farmer from "../models/farmer";
import Message from "../models/message";

import {
  createRazorpayOrder,
  verifyPaymentSignature,
} from "../services/paymentService";

import {
  generateQrToken,
  generateQrCodeDataUrl,
} from "../services/qrService";

import { computeOrderFees } from "../services/feeService";

import {
  decrementFarmerStock,
} from "../services/farmerStock";

import {
  logConfirmedOrderOnChain,
  logEscrowFundedOnChain,
} from "./orderController";

import { emitToUser } from "../socket";

const AGENTS_URL =
  process.env.AGENTS_URL ||
  "http://localhost:8001";

/* ============================================================
   CREATE RAZORPAY PAYMENT ORDER
   POST /api/orders/:orderId/create-payment
============================================================ */

export async function createPaymentOrder(
  req: any,
  res: Response
) {
  try {
    const order =
      await Order.findById(
        req.params.orderId
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    /*
     * Company authentication is already applied
     * by the route, but we ALSO verify ownership.
     */
    if (
      order.companyId.toString() !==
      req.user.companyId.toString()
    ) {
      return res.status(403).json({
        success: false,
        error:
          "You are not authorized to pay for this order",
      });
    }

    if (
      order.status !==
      "awaiting_payment"
    ) {
      return res.status(409).json({
        success: false,
        error:
          `Order is in status '${order.status}', not payable`,
      });
    }

    const fees = computeOrderFees(
      order.amount,
      order.quantity
    );

    order.fees = fees;

    const {
      razorpayOrderId,
      amountPaise,
      keyId,
    } = await createRazorpayOrder(
      fees.grandTotal,
      order.id
    );

    order.escrow.razorpayOrderId =
      razorpayOrderId;

    order.escrow.amountPaidPaise =
      amountPaise;

    order.escrow.currency = "INR";

    order.status =
      "payment_processing";

    await order.save();

    return res.json({
      success: true,
      razorpayOrderId,
      amountPaise,
      keyId,
      currency: "INR",
      breakdown: fees,
      orderId: order.id,
    });
  } catch (error: any) {
    console.error(
      "createPaymentOrder error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Server error",
    });
  }
}

/* ============================================================
   VERIFY RAZORPAY PAYMENT
   POST /api/orders/:orderId/verify-payment
============================================================ */

export async function verifyPayment(
  req: any,
  res: Response
) {
  try {
    const {
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return res.status(400).json({
        success: false,
        error:
          "razorpayPaymentId and razorpaySignature are required",
      });
    }

    const order =
      await Order.findById(
        req.params.orderId
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    /*
     * IMPORTANT:
     * Only the company that created the order
     * can verify its payment.
     */
    if (
      order.companyId.toString() !==
      req.user.companyId.toString()
    ) {
      return res.status(403).json({
        success: false,
        error:
          "You are not authorized to verify this payment",
      });
    }

    if (
      !order.escrow?.razorpayOrderId
    ) {
      return res.status(400).json({
        success: false,
        error:
          "No payment order was created for this order",
      });
    }

    const valid =
      verifyPaymentSignature(
        order.escrow
          .razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

    if (!valid) {
      return res.status(400).json({
        success: false,
        error:
          "Payment signature verification failed",
      });
    }

    /*
     * Prevent duplicate verification.
     */
    if (
      order.escrow
        ?.razorpayPaymentId
    ) {
      return res.status(409).json({
        success: false,
        error:
          "Payment has already been verified",
      });
    }

    /*
     * Reserve stock.
     */
    const stockResult =
      await decrementFarmerStock(
        order.farmerId.toString(),
        order.cropId,
        order.quantity
      );

    if (!stockResult.success) {
      order.status = "rejected";
      await order.save();

      return res.status(409).json({
        success: false,
        error: stockResult.reason,
        note:
          "Payment was captured but stock could not be reserved. Refund required in live integration.",
      });
    }

    /*
     * Mark escrow funded.
     */
    order.escrow.razorpayPaymentId =
      razorpayPaymentId;

    order.escrow.razorpaySignature =
      razorpaySignature;

    order.escrow.fundedAt =
      new Date();

    order.status =
      "escrow_funded";

    /*
     * Blockchain escrow record.
     */
    const {
      txHash: escrowTxHash,
    } =
      await logEscrowFundedOnChain({
        orderId: order.id,
        razorpayOrderId:
          order.escrow
            .razorpayOrderId,
        razorpayPaymentId,
        amountPaidPaise:
          order.escrow
            .amountPaidPaise!,
      });

    order.escrow.escrowChainTxHash =
      escrowTxHash;

    /*
     * Load company + farmer.
     */
    const [company, farmer] =
      await Promise.all([
        Company.findById(
          order.companyId
        ),
        Farmer.findById(
          order.farmerId
        ),
      ]);

    if (!company || !farmer) {
      throw new Error(
        "Company or farmer not found"
      );
    }

    /*
     * Fraud agent.
     */
    await axios.post(
      `${AGENTS_URL}/escrow/check-fraud`,
      {
        orderId: order.id,

        companyId:
          order.companyId.toString(),

        farmerId:
          order.farmerId.toString(),

        orderAmount:
          order.amount,

        companyVerificationPassed:
          order.verification.passed,

        stockCheckPassed:
          order.stockCheck.passed,

        companyPastOrderCount:
          company.get(
            "pastOrderCount"
          ) ?? 0,

        companyDisputeCount:
          company.get(
            "disputeCount"
          ) ?? 0,

        farmerPastOrderCount:
          farmer.get(
            "pastOrderCount"
          ) ?? 0,

        farmerDisputeCount:
          farmer.get(
            "disputeCount"
          ) ?? 0,
      }
    );

    /*
     * Wallet validation.
     */
    if (
      !company.walletAddress ||
      !farmer.walletAddress
    ) {
      throw new Error(
        "Missing wallet address for company or farmer"
      );
    }

    /*
     * Confirm order on chain.
     */
    const {
      txHash: confirmedTxHash,
    } =
      await logConfirmedOrderOnChain({
        orderId: order.id,

        companyAddr:
          company.walletAddress,

        farmerAddr:
          farmer.walletAddress,

        cropName:
          order.cropName,

        quantity:
          order.quantity,

        amount:
          order.amount,
      });

    order.chainTxHash =
      confirmedTxHash;

    await order.save();

    /*
     * Generate invoice + release shipment.
     */
    const result =
      await generateInvoiceAndReleaseShipmentTranche(
        order
      );

    return res.json({
      success: true,
      order: result,
      routedToAdmin: false,
    });
  } catch (error: any) {
    console.error(
      "verifyPayment error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Server error",
    });
  }
}

/* ============================================================
   GENERATE INVOICE
============================================================ */

export async function generateInvoiceAndReleaseShipmentTranche(
  order: any
) {
  const [company, farmer] =
    await Promise.all([
      Company.findById(
        order.companyId
      ),
      Farmer.findById(
        order.farmerId
      ),
    ]);

  if (!company || !farmer) {
    throw new Error(
      "Company or farmer not found"
    );
  }

  const SHIPMENT_PERCENT = 10;
  const DELIVERY_PERCENT = 90;

  const invoiceNumber =
    `AH-INV-${order.id
      .slice(-8)
      .toUpperCase()}`;

  const qrToken =
    generateQrToken();

  const baseUrl =
    process.env.PUBLIC_APP_URL ||
    "http://localhost:8000";

  const verifyUrl =
    `${baseUrl}/api/public/verify/${order.id}/${qrToken}`;

  const qrCodeDataUrl =
    await generateQrCodeDataUrl(
      order.id,
      qrToken
    );

  /*
   * Generate invoice through agent.
   */
  const invoiceRes =
    await axios.post(
      `${AGENTS_URL}/escrow/generate-invoice`,
      {
        orderId: order.id,

        invoiceNumber,

        companyName:
          company.name,

        companyGstNumber:
          order.verification
            ?.gstNumber,

        farmerName:
          farmer.name,

        farmerLocation:
          farmer.address ??
          "N/A",

        cropName:
          order.cropName,

        quantity:
          order.quantity,

        unit: "kg",

        cropSubtotal:
          order.amount,

        platformFeePercent:
          order.fees
            .platformFeePercent,

        platformFeeAmount:
          order.fees
            .platformFeeAmount,

        transportationFeeAmount:
          order.fees
            .transportationFeeAmount,

        gstOnFeesPercent:
          order.fees
            .gstOnFeesPercent,

        gstOnFeesAmount:
          order.fees
            .gstOnFeesAmount,

        grandTotal:
          order.fees
            .grandTotal,

        shipmentTranchePercent:
          SHIPMENT_PERCENT,

        deliveryTranchePercent:
          DELIVERY_PERCENT,

        verifyUrl,
      }
    );

  /*
   * Store invoice.
   */
  order.invoice = {
    invoiceNumber,

    invoiceText:
      invoiceRes.data
        .invoiceText,

    invoicePdfBase64:
      invoiceRes.data
        .pdfBase64,

    generatedAt:
      new Date(),

    qrToken,

    qrCodeDataUrl,
  };

  /*
   * Create tranches.
   */
  order.tranches = [
    {
      type: "shipment",

      percent:
        SHIPMENT_PERCENT,

      amount:
        order.amount *
        (SHIPMENT_PERCENT / 100),

      status: "pending",
    },

    {
      type: "delivery",

      percent:
        DELIVERY_PERCENT,

      amount:
        order.amount *
        (DELIVERY_PERCENT / 100),

      status: "pending",
    },
  ];

  /*
   * Release shipment tranche.
   */
  await releaseTranche(
    order,
    "shipment"
  );

  order.status =
    "shipment_released";

  await order.save();

  const shipmentTranche =
    order.tranches.find(
      (t: any) =>
        t.type === "shipment"
    );

  /*
   * Persistent farmer notification.
   */
  const notifyText =
    `💰 Payment received for ${order.cropName} (${order.quantity} kg). ` +
    `Invoice ${invoiceNumber} generated. ` +
    `₹${shipmentTranche?.amount?.toLocaleString(
      "en-IN"
    )} (${SHIPMENT_PERCENT}% shipment tranche) ` +
    `has been released to your account — you can start shipment.`;

  const notifyMessage =
    await Message.create({
      senderId:
        order.companyId.toString(),

      senderType: "company",

      receiverId:
        order.farmerId.toString(),

      receiverType: "farmer",

      text: notifyText,

      /*
       * If your Message schema supports orderId,
       * this makes the message clickable too.
       */
      orderId: order._id,
    });

  /*
   * Socket events.
   */
  emitToUser(
    order.farmerId.toString(),
    "farmer",
    "receive_message",
    notifyMessage
  );

  emitToUser(
    order.companyId.toString(),
    "company",
    "receive_message",
    notifyMessage
  );

  emitToUser(
    order.farmerId.toString(),
    "farmer",
    "unread:update",
    {
      senderId:
        order.companyId.toString(),

      senderType: "company",
    }
  );

  emitToUser(
    order.farmerId.toString(),
    "farmer",
    "order:payment_received",
    {
      orderId: order.id,

      message:
        `Payment received. ${SHIPMENT_PERCENT}% transferred to your account — start shipment.`,

      invoiceNumber,
    }
  );

  emitToUser(
    order.companyId.toString(),
    "company",
    "order:invoice_ready",
    {
      orderId: order.id,
      invoiceNumber,
    }
  );

  return order;
}

/* ============================================================
   RELEASE TRANCHE
============================================================ */

export async function releaseTranche(
  order: any,
  type:
    | "shipment"
    | "delivery"
) {
  const tranche =
    order.tranches?.find(
      (t: any) =>
        t.type === type
    );

  if (
    !tranche ||
    tranche.status === "released"
  ) {
    return order;
  }

  const {
    logTrancheReleasedOnChain,
  } =
    await import(
      "./orderController"
    );

  const { txHash } =
    await logTrancheReleasedOnChain({
      orderId: order.id,

      type,

      percent:
        tranche.percent,

      amount:
        tranche.amount,
    });

  tranche.status =
    "released";

  tranche.releasedAt =
    new Date();

  tranche.chainTxHash =
    txHash;

  return order;
}