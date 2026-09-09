import { Router, Response } from "express";
import jwt from "jsonwebtoken";

import Shipment from "../models/shipment";

import { companyAuthMiddleware } from "../middlewares/companyAuthMiddleware";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| COMPANY - Get all shipments
|--------------------------------------------------------------------------
*/

router.get(
  "/company",
  companyAuthMiddleware,
  async (req: any, res: Response) => {
    try {
      const shipments = await Shipment.find({
        companyId: req.user.companyId,
      })
        .populate("farmerId", "name address contact lat lng")
        .populate("orderId", "cropName quantity amount status invoice escrow tranches")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({ success: true, shipments });
    } catch (error) {
      console.error("❌ Get company shipments error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch shipments" });
    }
  }
);

/*
|--------------------------------------------------------------------------
| COMPANY - Get single shipment
|--------------------------------------------------------------------------
*/

router.get(
  "/company/:shipmentId",
  companyAuthMiddleware,
  async (req: any, res: Response) => {
    try {
      const shipment = await Shipment.findOne({
        _id: req.params.shipmentId,
        companyId: req.user.companyId,
      })
        .populate("farmerId", "name address contact lat lng")
        .populate("orderId", "cropName quantity amount status invoice escrow tranches")
        .lean();

      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found" });
      }

      return res.json({ success: true, shipment });
    } catch (error) {
      console.error("❌ Get company shipment error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch shipment" });
    }
  }
);

/*
|--------------------------------------------------------------------------
| FARMER - Get all shipments
|--------------------------------------------------------------------------
*/

router.get(
  "/farmer",
  authMiddleware,
  async (req: any, res: Response) => {
    try {
      const shipments = await Shipment.find({
        farmerId: req.user.farmerId,
      })
        .populate("companyId", "name email")
        .populate("orderId", "cropName quantity amount status")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({ success: true, shipments });
    } catch (error) {
      console.error("❌ Get farmer shipments error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch shipments" });
    }
  }
);

/*
|--------------------------------------------------------------------------
| FARMER - Get single shipment
|--------------------------------------------------------------------------
*/

router.get(
  "/farmer/:shipmentId",
  authMiddleware,
  async (req: any, res: Response) => {
    try {
      const shipment = await Shipment.findOne({
        _id: req.params.shipmentId,
        farmerId: req.user.farmerId,
      })
        .populate("companyId", "name email")
        .populate("orderId", "cropName quantity amount status")
        .lean();

      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found" });
      }

      return res.json({ success: true, shipment });
    } catch (error) {
      console.error("❌ Get farmer shipment error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch shipment" });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE SHIPMENT STATUS
|--------------------------------------------------------------------------
|
| This will eventually be triggered by driver/transport automation.
| Until that exists, any authenticated company or farmer account tied
| to the shipment can update it. companyAuthMiddleware/authMiddleware
| are role-specific, so this route verifies the JWT directly and
| accepts either a companyId or farmerId claim, then confirms the
| caller actually owns the shipment being updated.
|
*/

router.patch(
  "/:shipmentId/status",
  async (req: any, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (!token) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }

      let claims: any;
      try {
        claims = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
      }

      const { status } = req.body;

      const validStatuses = [
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid shipment status" });
      }

      const shipment = await Shipment.findById(req.params.shipmentId);
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found" });
      }

      const isOwningCompany =
        claims.companyId && shipment.companyId.toString() === claims.companyId.toString();

      const isOwningFarmer =
        claims.farmerId && shipment.farmerId.toString() === claims.farmerId.toString();

      if (!isOwningCompany && !isOwningFarmer) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this shipment",
        });
      }

      shipment.status = status;

      if (status === "picked_up") {
        shipment.pickedUpAt = new Date();
      }

      if (status === "in_transit") {
        shipment.inTransitAt = new Date();
      }

      if (status === "delivered") {
        shipment.deliveredAt = new Date();
      }

      await shipment.save();

      return res.json({ success: true, shipment });
    } catch (error) {
      console.error("❌ Update shipment status error:", error);
      return res.status(500).json({ success: false, message: "Failed to update shipment status" });
    }
  }
);

export default router;