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
import { decrementFarmerStock } from "../services/farmerStock";

import {
  logConfirmedOrderOnChain,
  logEscrowFundedOnChain,
  logTrancheReleasedOnChain,
} from "./orderController";

import { createShipmentForOrder } from "../services/logisticsService";
import { emitToUser } from "../socket";

const AGENTS_URL =
  process.env.AGENTS_URL || "http://localhost:8001";

const BASE_URL =
  process.env.PUBLIC_APP_URL || "http://localhost:8000";

const SHIPMENT_PERCENT = 10;
const DELIVERY_PERCENT = 90;

function assertCompanyOwnsOrder(order: any, req: any) {
  if (
    order.companyId.toString() !==
    req.user.companyId.toString()
  ) {
    const err: any = new Error(
      "You are not authorized to access this order"
    );

    err.status = 403;
    throw err;
  }
}

function sendError(res: Response, error: any) {
  console.error(error);

  const status = error.status || 500;

  return res.status(status).json({
    success: false,
    error: error.message || "Server error",
  });
}

/* ============================================================
   CREATE RAZORPAY PAYMENT ORDER
   POST /api/orders/:orderId/create-payment
============================================================ */

export async function createPaymentOrder(
  req: any,
  res: Response
) {
  try {
    const order = await Order.findById(
      req.params.orderId
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    assertCompanyOwnsOrder(order, req);

    if (order.status !== "awaiting_payment") {
      return res.status(409).json({
        success: false,
        error: `Order is in status '${order.status}', not payable`,
      });
    }

    const fees = computeOrderFees(
      order.amount,
      order.quantity
    );

    const {
      razorpayOrderId,
      amountPaise,
      keyId,
    } = await createRazorpayOrder(
      fees.grandTotal,
      order.id
    );

    order.fees = fees;

    order.escrow.razorpayOrderId =
      razorpayOrderId;

    order.escrow.amountPaidPaise =
      amountPaise;

    order.escrow.currency = "INR";

    order.status = "payment_processing";

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
    return sendError(res, error);
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

    const preCheck = await Order.findById(
      req.params.orderId
    );

    if (!preCheck) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    assertCompanyOwnsOrder(preCheck, req);

    const razorpayOrderId =
      preCheck.escrow?.razorpayOrderId;

    if (!razorpayOrderId) {
      return res.status(400).json({
        success: false,
        error:
          "No payment order was created for this order",
      });
    }

    const valid = verifyPaymentSignature(
      razorpayOrderId,
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
     * This timestamp is the canonical transaction
     * timestamp for the entire AyurHerb transaction.
     *
     * It is later reused by:
     * - Invoice PDF
     * - QR verification page
     * - Public verification response
     *
     * This prevents the invoice and QR from showing
     * different transaction times.
     */
    const transactionAt = new Date();

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        "escrow.razorpayPaymentId": {
          $exists: false,
        },
      },
      {
        $set: {
          "escrow.razorpayPaymentId":
            razorpayPaymentId,

          "escrow.razorpaySignature":
            razorpaySignature,

          "escrow.fundedAt":
            transactionAt,

          status: "escrow_funded",
        },
      },
      {
        new: true,
      }
    );

    if (!order) {
      return res.status(409).json({
        success: false,
        error:
          "Payment has already been verified",
      });
    }

    /* ========================================================
       RESERVE FARMER STOCK
    ======================================================== */

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

    /* ========================================================
       LOAD COMPANY + FARMER
    ======================================================== */

    const [company, farmer] =
      await Promise.all([
        Company.findById(order.companyId),
        Farmer.findById(order.farmerId),
      ]);

    if (!company || !farmer) {
      throw new Error(
        "Company or farmer not found"
      );
    }

    if (
      !company.walletAddress ||
      !farmer.walletAddress
    ) {
      throw new Error(
        "Missing wallet address for company or farmer"
      );
    }

    /* ========================================================
       FRAUD CHECK
    ======================================================== */

    await axios.post(
      `${AGENTS_URL}/escrow/check-fraud`,
      {
        orderId: order.id,

        companyId:
          order.companyId.toString(),

        farmerId:
          order.farmerId.toString(),

        orderAmount: order.amount,

        companyVerificationPassed:
          order.verification.passed,

        stockCheckPassed:
          order.stockCheck.passed,

        companyPastOrderCount:
          company.get("pastOrderCount") ?? 0,

        companyDisputeCount:
          company.get("disputeCount") ?? 0,

        farmerPastOrderCount:
          farmer.get("pastOrderCount") ?? 0,

        farmerDisputeCount:
          farmer.get("disputeCount") ?? 0,
      }
    );

    /* ========================================================
       CONFIRM ORDER ON BLOCKCHAIN
       IMPORTANT:
       OrderLog.sol requires confirmation before
       escrow can be funded.
    ======================================================== */

    const {
      txHash: confirmedTxHash,
    } = await logConfirmedOrderOnChain({
      orderId: order.id,

      companyAddr:
        company.walletAddress,

      farmerAddr:
        farmer.walletAddress,

      cropName: order.cropName,

      quantity: order.quantity,

      amount: order.amount,
    });

    order.chainTxHash =
      confirmedTxHash;

    /* ========================================================
       FUND ESCROW ON BLOCKCHAIN
    ======================================================== */

    const {
      txHash: escrowTxHash,
    } = await logEscrowFundedOnChain({
      orderId: order.id,

      razorpayOrderId,

      razorpayPaymentId,

      amountPaidPaise:
        order.escrow.amountPaidPaise!,
    });

    order.escrow.escrowChainTxHash =
      escrowTxHash;

    await order.save();

    /* ========================================================
       CREATE SHIPMENT
    ======================================================== */

    await createShipmentForOrder(
      order,
      farmer
    );

    /* ========================================================
       GENERATE INVOICE + QR + RELEASE SHIPMENT TRANCHE
    ======================================================== */

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
    return sendError(res, error);
  }
}

/* ============================================================
   GENERATE INVOICE + RELEASE SHIPMENT TRANCHE
============================================================ */

export async function generateInvoiceAndReleaseShipmentTranche(
  order: any
) {
  const [company, farmer] =
    await Promise.all([
      Company.findById(order.companyId),
      Farmer.findById(order.farmerId),
    ]);

  if (!company || !farmer) {
    throw new Error(
      "Company or farmer not found"
    );
  }

  /*
   * The transaction timestamp is taken from escrow.fundedAt.
   *
   * This is the same timestamp created during successful
   * Razorpay payment verification.
   *
   * It is intentionally different from invoice.generatedAt.
   */
  const transactionAt =
    order.escrow?.fundedAt ??
    new Date();

  const invoiceNumber =
    `AH-INV-${order.id
      .slice(-8)
      .toUpperCase()}`;

  /* ========================================================
     QR TOKEN
  ======================================================== */

  const qrToken =
    generateQrToken();

  const verifyUrl =
    `${BASE_URL}/api/public/verify/${order.id}/${qrToken}`;

  const qrCodeDataUrl =
    await generateQrCodeDataUrl(
      order.id,
      qrToken
    );

  /* ========================================================
     GENERATE INVOICE
  ======================================================== */

  const invoiceRes =
    await axios.post(
      `${AGENTS_URL}/escrow/generate-invoice`,
      {
        orderId: order.id,

        invoiceNumber,

        /*
         * Canonical transaction timestamp.
         * The invoice service should use this to print
         * the transaction date and time.
         */
        transactionAt,

        companyName:
          company.name,

        companyGstNumber:
          order.verification?.gstNumber,

        farmerName:
          farmer.name,

        farmerLocation:
          farmer.address ?? "N/A",

        cropName:
          order.cropName,

        quantity:
          order.quantity,

        unit: "kg",

        cropSubtotal:
          order.amount,

        platformFeePercent:
          order.fees.platformFeePercent,

        platformFeeAmount:
          order.fees.platformFeeAmount,

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
          order.fees.grandTotal,

        shipmentTranchePercent:
          SHIPMENT_PERCENT,

        deliveryTranchePercent:
          DELIVERY_PERCENT,

        verifyUrl,
      }
    );

  /* ========================================================
     STORE INVOICE
  ======================================================== */

  order.invoice = {
    invoiceNumber,

    invoiceText:
      invoiceRes.data.invoiceText,

    invoicePdfBase64:
      invoiceRes.data.pdfBase64,

    /*
     * This is the time the invoice itself was generated.
     * It is NOT the transaction timestamp.
     */
    generatedAt:
      new Date(),

    qrToken,

    qrCodeDataUrl,
  };

  /* ========================================================
     CREATE ESCROW TRANCHES
  ======================================================== */

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

  /* ========================================================
     RELEASE SHIPMENT TRANCHE
  ======================================================== */

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

  /* ========================================================
     FARMER NOTIFICATION
  ======================================================== */

  const notifyText =
    `💰 Payment received for ${order.cropName} (${order.quantity} kg). ` +
    `Invoice ${invoiceNumber} generated. ` +
    `₹${shipmentTranche?.amount?.toLocaleString("en-IN")} ` +
    `(${SHIPMENT_PERCENT}% shipment tranche) ` +
    `has been released to your account — you can start shipment.`;

  const notifyMessage =
    await Message.create({
      senderId:
        order.companyId.toString(),

      senderType:
        "company",

      receiverId:
        order.farmerId.toString(),

      receiverType:
        "farmer",

      text: notifyText,

      orderId:
        order._id,
    });

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

      senderType:
        "company",
    }
  );

  emitToUser(
    order.farmerId.toString(),
    "farmer",
    "order:payment_received",
    {
      orderId:
        order.id,

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
      orderId:
        order.id,

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

  const { txHash } =
    await logTrancheReleasedOnChain({
      orderId:
        order.id,

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