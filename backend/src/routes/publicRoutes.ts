import { Router, Response } from "express";
import Order from "../models/order";
import {
  generatePublicProvenancePdf,
} from "../controllers/publicVerificationController";

const router = Router();


router.get(
  "/verify/:orderId/:qrToken",
  async (req: any, res: Response) => {
    try {
      const { orderId, qrToken } = req.params;

      const order = await Order.findById(orderId)
        .populate("companyId", "name")
        .populate("farmerId", "name address location")
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Invalid or expired verification link",
        });
      }

      const invoice = order.invoice;

      if (!invoice || invoice.qrToken !== qrToken) {
        return res.status(404).json({
          success: false,
          error: "Invalid or expired verification link",
        });
      }

      const company = order.companyId as any;
      const farmer = order.farmerId as any;

      return res.json({
        success: true,

        orderId: order._id,

        invoiceNumber: invoice.invoiceNumber,

        crop: {
          name: order.cropName,
          quantity: order.quantity,
          amount: order.amount,
        },

        buyer: {
          name: company?.name || "Unknown buyer",
        },

        seller: {
          name: farmer?.name || "Unknown farmer",
          address: farmer?.address || null,
          location: farmer?.location || null,
        },

        status: order.status,

        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          generatedAt: invoice.generatedAt,

          // This is the dynamic Crop Journey PDF endpoint.
          // It is NOT the stored invoice PDF.
          pdfUrl:
            `/api/public/verify/${order._id}/${invoice.qrToken}/pdf`,
        },

        chainProof: {
          orderConfirmedTxHash: order.chainTxHash,

          escrowFundedTxHash:
            order.escrow?.escrowChainTxHash,

          tranches:
            order.tranches?.map((t: any) => ({
              type: t.type,
              percent: t.percent,
              amount: t.amount,
              status: t.status,
              chainTxHash: t.chainTxHash,
              releasedAt: t.releasedAt,
            })) || [],
        },
      });
    } catch (err: any) {
      console.error("Public verification error:", err);

      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);


/**
 * GET
 *
 * /api/public/verify/:orderId/:qrToken/pdf
 *
 * THIS IS THE DYNAMIC CROP JOURNEY PDF ROUTE.
 *
 * The QR inside the invoice and the physical QR
 * attached to the shipment both point here.
 *
 * The generated PDF reflects the CURRENT order state.
 *
 * Example:
 * http://localhost:8000/api/public/verify/
 * 6a808ffebadd39d59c25af1d/
 * 9bc52d9ec2b4e66d7a9218e4e9e7f632/
 * pdf
 */


router.get(
  "/verify/:orderId/:qrToken/pdf",
  generatePublicProvenancePdf
);

export default router;