import {
  Router,
  Response,
} from "express";

import axios from "axios";

import Order from "../models/order";
import Farmer from "../models/farmer";
import Company from "../models/company";
import Message from "../models/message";

import {
  companyAuthMiddleware,
} from "../middlewares/companyAuthMiddleware";

import {
  createPaymentOrder,
  verifyPayment,
} from "../controllers/paymentController";

import { emitToUser } from "../socket";

const router = Router();

const AGENTS_URL =
  process.env.AGENTS_URL ||
  "http://localhost:8001";

/* ============================================================
   COMPANY ORDERS
   GET /api/orders/company
============================================================ */

router.get(
  "/company",
  companyAuthMiddleware,
  async (
    req: any,
    res: Response
  ) => {
    try {
      const orders =
        await Order.find({
          companyId:
            req.user.companyId,
        })
          .populate(
            "farmerId",
            "name address walletAddress"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const stats = {
        activeOrders:
          orders.filter(
            (order: any) =>
              ![
                "delivery_released",
                "rejected",
              ].includes(
                order.status
              )
          ).length,

        pendingOrders:
          orders.filter(
            (order: any) =>
              [
                "pending_verification",
                "pending_stock_check",
                "awaiting_payment",
                "payment_processing",
                "pending_admin_review",
              ].includes(
                order.status
              )
          ).length,

        deliveredOrders:
          orders.filter(
            (order: any) =>
              order.status ===
              "delivery_released"
          ).length,

        totalSpend:
          orders.reduce(
            (
              total: number,
              order: any
            ) => {
              if (
                [
                  "escrow_funded",
                  "shipment_released",
                  "delivery_released",
                ].includes(
                  order.status
                )
              ) {
                return (
                  total +
                  (
                    order.fees
                      ?.grandTotal ||
                    order.amount ||
                    0
                  )
                );
              }

              return total;
            },
            0
          ),
      };

      return res.json({
        success: true,
        orders,
        stats,
      });
    } catch (error) {
      console.error(
        "Company orders error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to fetch company orders",
      });
    }
  }
);

/* ============================================================
   CREATE ORDER
   POST /api/orders/create
============================================================ */

router.post(
  "/create",
  companyAuthMiddleware,
  async (
    req: any,
    res: Response
  ) => {
    try {
      const {
        farmerId,
        cropId,
        cropName,
        quantity,
        amount,
        gstNumber,
      } = req.body;

      if (
        !farmerId ||
        !cropId ||
        !cropName ||
        !quantity ||
        !amount ||
        !gstNumber
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required order fields",
        });
      }

      const [
        company,
        farmer,
      ] = await Promise.all([
        Company.findById(
          req.user.companyId
        ),

        Farmer.findById(
          farmerId
        ),
      ]);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: "Company not found",
        });
      }

      if (
        !company.walletAddress
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Connect a wallet before placing orders",
        });
      }

      if (!farmer) {
        return res.status(404).json({
          success: false,
          error:
            "Farmer not found",
        });
      }

      if (
        !farmer.walletAddress
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Farmer has no wallet on file",
        });
      }

      const order =
        new Order({
          companyId:
            req.user.companyId,

          farmerId,

          cropId,

          cropName,

          quantity,

          amount,

          status:
            "pending_verification",
        });

      /*
       * Company verification agent.
       */
      const verifyRes =
        await axios.post(
          `${AGENTS_URL}/verify-company`,
          {
            gstNumber,
          }
        );

      order.verification = {
        passed:
          verifyRes.data.passed,

        gstNumber,

        checkedAt:
          new Date(),

        reason:
          verifyRes.data.reason,
      };

      if (
        !verifyRes.data.passed
      ) {
        order.status =
          "verification_failed";

        await order.save();

        return res.status(403).json({
          success: false,
          order,
          error:
            verifyRes.data.reason,
        });
      }

      /*
       * Stock check.
       */
      order.status =
        "pending_stock_check";

      const crop =
        farmer.crops?.find(
          (c: any) =>
            c.cropId?.toString() ===
            cropId.toString()
        );

      const stockRes =
        await axios.post(
          `${AGENTS_URL}/check-stock`,
          {
            availableQuantity:
              crop?.quantity ?? 0,

            requestedQuantity:
              quantity,
          }
        );

      order.stockCheck = {
        passed:
          stockRes.data.passed,

        checkedAt:
          new Date(),

        reason:
          stockRes.data.reason,
      };

      if (
        !stockRes.data.passed
      ) {
        order.status =
          "insufficient_stock";

        await order.save();

        return res.status(409).json({
          success: false,
          order,
          error:
            stockRes.data.reason,
        });
      }

      /*
       * Payable.
       */
      order.status =
        "awaiting_payment";

      await order.save();

      /*
       * Notify farmer.
       */
      const notifyText =
        `New order request: ${quantity} kg of ${cropName} ` +
        `(₹${Number(
          amount
        ).toLocaleString("en-IN")}) from ${company.name}. ` +
        `Awaiting payment — this is not yet confirmed on-chain.`;

      const notifyMessage =
        await Message.create({
          senderId:
            req.user.companyId,

          senderType:
            "company",

          receiverId:
            farmerId,

          receiverType:
            "farmer",

          text:
            notifyText,

          orderId:
            order._id,
        });

      emitToUser(
        farmerId,
        "farmer",
        "receive_message",
        notifyMessage
      );

      emitToUser(
        req.user.companyId,
        "company",
        "receive_message",
        notifyMessage
      );

      return res.json({
        success: true,
        order,
      });
    } catch (error: any) {
      console.error(
        "Order creation error:",
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
);

/* ============================================================
   PAYMENT ROUTES
============================================================ */

router.post(
  "/:orderId/create-payment",
  companyAuthMiddleware,
  createPaymentOrder
);

router.post(
  "/:orderId/verify-payment",
  companyAuthMiddleware,
  verifyPayment
);

export default router;