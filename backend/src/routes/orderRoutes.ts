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
   MARKET PREVIEW
   POST /api/orders/market-preview

   Used by the order modal to show the agent's price reference
   before an order is created. Never writes anything — the
   authoritative pricing decision happens again, server-side,
   inside /create.
============================================================ */

router.post(
  "/market-preview",
  companyAuthMiddleware,
  async (
    req: any,
    res: Response
  ) => {
    try {
      const {
        cropName,
        companyOfferPrice,
      } = req.body;

      if (!cropName) {
        return res.status(400).json({
          success: false,
          error:
            "cropName is required",
        });
      }

      const marketRes =
        await axios.post(
          `${AGENTS_URL}/market/evaluate`,
          {
            cropName,
            companyOfferPrice:
              companyOfferPrice ??
              null,
          }
        );

      return res.json({
        success: true,
        data: marketRes.data,
      });
    } catch (error: any) {
      console.error(
        "Market preview error:",
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
        gstNumber,
        companyOfferPrice,
      } = req.body;

      if (
        !farmerId ||
        !cropId ||
        !cropName ||
        !quantity ||
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

      const crop =
        farmer.crops?.find(
          (c: any) =>
            c.cropId?.toString() ===
            cropId.toString()
        );

      const availableQuantity =
        crop?.quantity ?? 0;

      /*
       * A below-market offer is only honored when the company
       * is buying out the farmer's entire remaining stock of
       * this crop — a genuine clearance order. On a regular
       * order it would just be underpaying the farmer, so it's
       * rejected instead.
       */
      const isClearanceOrder =
        availableQuantity > 0 &&
        quantity >= availableQuantity;

      /*
       * Market agent decides the price. A company-submitted
       * price is only honored when:
       * - the agent reports UNAVAILABLE (no market data exists), or
       * - the agent reports LOW and this is a clearance order.
       * Otherwise the agent's modal price wins.
       */
      const marketRes = await axios.post(
        `${AGENTS_URL}/market/evaluate`,
        {
          cropName,
          state: null,
          district: null,
          companyOfferPrice:
            companyOfferPrice ?? null,
        }
      );

      const marketData = marketRes.data;
      const opportunityStatus =
        marketData.opportunity?.status;

      let unitPrice: number;
      let pricingSource:
        | "agent"
        | "company_override";

      if (opportunityStatus === "UNAVAILABLE") {
        if (
          companyOfferPrice === undefined ||
          companyOfferPrice === null
        ) {
          return res.status(400).json({
            success: false,
            error:
              "No market reference is available for this crop — enter a price manually",
          });
        }

        unitPrice = companyOfferPrice;
        pricingSource = "company_override";
      } else if (opportunityStatus === "LOW") {
        if (
          companyOfferPrice === undefined ||
          companyOfferPrice === null
        ) {
          return res.status(400).json({
            success: false,
            error: `Offer is below the market minimum. Raise it to at least ₹${marketData.market.min}/kg.`,
          });
        }

        if (!isClearanceOrder) {
          return res.status(400).json({
            success: false,
            error: `Offers below the market minimum (₹${marketData.market.min}/kg) are only accepted for stock clearance — ordering the farmer's full remaining ${availableQuantity} kg. Raise your offer to at least ₹${marketData.market.min}/kg, or increase the quantity to ${availableQuantity} kg.`,
          });
        }

        unitPrice = companyOfferPrice;
        pricingSource = "company_override";
      } else {
        unitPrice = marketData.market.modal;
        pricingSource = "agent";
      }

      const amount =
        Math.round(unitPrice * quantity * 100) / 100;

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

          pricing: {
            unitPrice,
            source: pricingSource,
            agentSuggestedUnitPrice:
              marketData.market?.modal ?? null,
            opportunity: marketData.opportunity,
            isClearanceOrder,
            marketReference:
              marketData.market?.min !== undefined
                ? {
                    min: marketData.market.min,
                    max: marketData.market.max,
                    modal: marketData.market.modal,
                    average: marketData.market.average,
                    unit: marketData.unit,
                    updatedAt: marketData.updatedAt,
                  }
                : undefined,
          },
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

      const stockRes =
        await axios.post(
          `${AGENTS_URL}/check-stock`,
          {
            availableQuantity,

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
        `(₹${amount.toLocaleString("en-IN")} at ₹${unitPrice}/kg, ` +
        `${
          pricingSource === "agent"
            ? "market rate"
            : isClearanceOrder
              ? "clearance offer"
              : "company offer"
        }) ` +
        `from ${company.name}. ` +
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