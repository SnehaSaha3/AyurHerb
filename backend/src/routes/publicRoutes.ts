import { Router, Response } from "express";
import Order from "../models/order";

const router = Router();

router.get(
  "/verify/:orderId/:qrToken",
  async (req: any, res: Response) => {
    try {
      const { orderId, qrToken } = req.params;

      const order = await Order.findById(orderId)
        .populate("companyId", "name")
        .populate("farmerId", "name location")
        .lean();

      if (!order) {
        return res.status(404).json({
          error: "Invalid or expired verification link",
        });
      }

      const invoice = order.invoice;

      if (!invoice || invoice.qrToken !== qrToken) {
        return res.status(404).json({
          error: "Invalid or expired verification link",
        });
      }

      /*
       * Mongoose knows these are populated at runtime,
       * but TypeScript still sees them as ObjectId.
       */
      const company = order.companyId as unknown as {
        _id: string;
        name: string;
      };

      const farmer = order.farmerId as unknown as {
        _id: string;
        name: string;
        location?: unknown;
      };

      return res.json({
        success: true,

        orderId: order._id,

        invoiceNumber: invoice.invoiceNumber,

        crop: {
          name: order.cropName,
          quantity: order.quantity,
        },

        buyer: company?.name,

        seller: {
          name: farmer?.name,
          location: farmer?.location,
        },

        status: order.status,

        chainProof: {
          orderConfirmedTxHash: order.chainTxHash,

          escrowFundedTxHash:
            order.escrow?.escrowChainTxHash,

          tranches: order.tranches?.map((t: any) => ({
            type: t.type,
            status: t.status,
            chainTxHash: t.chainTxHash,
          })),
        },
      });
    } catch (err: any) {
      console.error("public verify error:", err);

      return res.status(500).json({
        error: "Server error",
      });
    }
  }
);

/**
 * GET /public/verify/:orderId/:qrToken/pdf
 */
router.get(
  "/verify/:orderId/:qrToken/pdf",
  async (req: any, res: Response) => {
    try {
      const { orderId, qrToken } = req.params;

      const order = await Order.findById(orderId).lean();

      if (!order) {
        return res.status(404).json({
          error: "Invalid or expired verification link",
        });
      }

      const invoice = order.invoice;

      if (!invoice || invoice.qrToken !== qrToken) {
        return res.status(404).json({
          error: "Invalid or expired verification link",
        });
      }

      if (!invoice.invoicePdfBase64) {
        return res.status(404).json({
          error: "Invoice PDF is not available",
        });
      }

      const pdfBuffer = Buffer.from(
        invoice.invoicePdfBase64,
        "base64"
      );

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${invoice.invoiceNumber}.pdf"`
      );

      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error("public verify pdf error:", err);

      return res.status(500).json({
        error: "Server error",
      });
    }
  }
);

export default router;