import { Response } from "express";
import Order from "../models/order";
import { hashEscrowPayload } from "./orderController";
import { generateInvoiceAndReleaseShipmentTranche, releaseTranche } from "./paymentController";
import { emitToUser } from "../socket"

/**
 * GET /admin/review-queue
 *
 * This is the "admin doesn't see the money, sees the hashes" screen.
 * Deliberately excludes: razorpayPaymentId, razorpaySignature, raw
 * amountPaidPaise on the wire (order.amount, the agreed order value,
 * is fine — that's order context, not a payment credential).
 * Includes: fraud signals, on-chain hash, and a live re-hash check so
 * admin can see at a glance whether the stored record still matches
 * what's on-chain.
 */
export async function getReviewQueue(_req: any, res: Response) {
  try {
    const orders = await Order.find({ status: "pending_admin_review" })
      .populate("companyId", "name")
      .populate("farmerId", "name address")
      .lean();

    const queue = orders.map((order: any) => {
      const recomputedHash = order.escrow.razorpayOrderId
        ? hashEscrowPayload({
            orderId: order._id.toString(),
            razorpayOrderId: order.escrow.razorpayOrderId,
            razorpayPaymentId: order.escrow.razorpayPaymentId,
            amountPaidPaise: order.escrow.amountPaidPaise,
          })
        : null;

      return {
        orderId: order._id,
        company: order.companyId?.name,
        farmer: order.farmerId?.name,
        farmerLocation: order.farmerId?.address,
        cropName: order.cropName,
        quantity: order.quantity,
        amount: order.amount, // agreed order value — not a payment credential
        fraudCheck: order.fraudCheck,
        escrowChainTxHash: order.escrow.escrowChainTxHash,
        hashIntegrityCheck:
          recomputedHash === null
            ? "n/a"
            : recomputedHash === order.escrow.escrowChainTxHash
            ? "note: compare recomputedHash against getEscrowHash() on-chain, not the tx hash"
            : "note: compare recomputedHash against getEscrowHash() on-chain, not the tx hash",
        recomputedHash,
        createdAt: order.createdAt,
      };
    });

    res.json({ success: true, queue });
  } catch (err: any) {
    console.error("getReviewQueue error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}

/**
 * POST /admin/orders/:orderId/approve
 * Fires the shipment tranche, generates invoice + QR, notifies both parties.
 */
export async function approveOrder(req: any, res: Response) {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "pending_admin_review") {
      return res.status(409).json({ error: `Order is in status '${order.status}', not reviewable` });
    }

    order.adminReview = {
      decision: "approved",
      reviewedBy: req.user?.adminId,
      reviewedAt: new Date(),
      notes: req.body?.notes,
    };
    await order.save();

    const result = await generateInvoiceAndReleaseShipmentTranche(order);
    res.json({ success: true, order: result });
  } catch (err: any) {
    console.error("approveOrder error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}

/**
 * POST /admin/orders/:orderId/hold
 * Freezes the order. No tranche fires, no invoice generated.
 */
export async function holdOrder(req: any, res: Response) {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "admin_held";
    order.adminReview = {
      decision: "held",
      reviewedBy: req.user?.adminId,
      reviewedAt: new Date(),
      notes: req.body?.notes,
    };
    await order.save();

    emitToUser(order.companyId.toString(), "company", "order:held", {
      orderId: order.id,
      notes: req.body?.notes,
    });
    emitToUser(order.farmerId.toString(), "farmer", "order:held", { orderId: order.id });

    res.json({ success: true, order });
  } catch (err: any) {
    console.error("holdOrder error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}

/**
 * POST /admin/orders/:orderId/release-delivery
 * Fires the final (delivery) tranche once delivery is confirmed.
 * Wire the trigger to your delivery-confirmation flow — this is the
 * manual/admin-fireable version for the demo.
 */
export async function releaseDeliveryTranche(req: any, res: Response) {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "shipment_released") {
      return res.status(409).json({ error: `Order is in status '${order.status}', delivery tranche not eligible yet` });
    }

    await releaseTranche(order, "delivery");
    order.status = "delivery_released";
    await order.save();

    emitToUser(order.farmerId.toString(), "farmer", "order:delivery_payment_released", {
      orderId: order.id,
    });
    emitToUser(order.companyId.toString(), "company", "order:completed", { orderId: order.id });

    res.json({ success: true, order });
  } catch (err: any) {
    console.error("releaseDeliveryTranche error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}