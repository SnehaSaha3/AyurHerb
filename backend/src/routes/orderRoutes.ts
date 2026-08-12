import { Router, Response } from "express";
import { companyAuthMiddleware } from "../middlewares/companyAuthMiddleware";
import axios from "axios";
import Order from "../models/order"
import Farmer from "../models/farmer";
import Company from "../models/company";
import { logConfirmedOrderOnChain } from "../controllers/orderController"
import { createPaymentOrder, verifyPayment } from "../controllers/paymentController";
 

const router = Router();
const AGENTS_URL = process.env.AGENTS_URL || "http://localhost:8001";

router.post("/create", companyAuthMiddleware, async (req: any, res: Response) => {
  try {
    const { farmerId, cropId, cropName, quantity, amount, gstNumber } = req.body;

    if (!farmerId || !cropId || !quantity || !amount || !gstNumber) {
      return res.status(400).json({ error: "Missing required order fields" });
    }

    const [company, farmer] = await Promise.all([
      Company.findById(req.user.companyId),
      Farmer.findById(farmerId),
    ]);

    if (!company?.walletAddress) {
      return res.status(400).json({ error: "Connect a wallet before placing orders" });
    }
    if (!farmer?.walletAddress) {
      return res.status(404).json({ error: "Farmer not found or has no wallet on file" });
    }

    const order = new Order({
      companyId: req.user.companyId,
      farmerId,
      cropId,
      cropName,
      quantity,
      amount,
      status: "pending_verification",
    });

    // Agent 1 — identity verification (Mongo only, no chain write)
    const verifyRes = await axios.post(`${AGENTS_URL}/verify-company`, { gstNumber });
    order.verification = {
      passed: verifyRes.data.passed,
      gstNumber,
      checkedAt: new Date(),
      reason: verifyRes.data.reason,
    };

    if (!verifyRes.data.passed) {
      order.status = "verification_failed";
      await order.save();
      return res.status(403).json({ success: false, order, error: verifyRes.data.reason });
    }

    // Agent 2 — stock check (Mongo only, no chain write)
    order.status = "pending_stock_check";
    const crop = farmer.crops?.find((c: any) => c.cropId === cropId);
    const stockRes = await axios.post(`${AGENTS_URL}/check-stock`, {
      availableQuantity: crop?.quantity ?? 0,
      requestedQuantity: quantity,
    });
    order.stockCheck = {
      passed: stockRes.data.passed,
      checkedAt: new Date(),
      reason: stockRes.data.reason,
    };

    if (!stockRes.data.passed) {
      order.status = "insufficient_stock";
      await order.save();
      return res.status(409).json({ success: false, order, error: stockRes.data.reason });
    }

    // Both checks passed — order is genuinely confirmed. This is the
    // ONLY point that touches the blockchain, and it happens exactly once.
    order.status = "awaiting_payment";
    await order.save();

    const { txHash } = await logConfirmedOrderOnChain({
      orderId: order.id,
      companyAddr: company.walletAddress,
      farmerAddr: farmer.walletAddress,
      cropName,
      quantity,
      amount,
    });

    order.chainTxHash = txHash;
    await order.save();

    res.json({ success: true, order });
  } catch (err: any) {
    console.error("Order creation error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
});


router.post("/:orderId/create-payment", companyAuthMiddleware, createPaymentOrder);
router.post("/:orderId/verify-payment", companyAuthMiddleware, verifyPayment);

export default router;