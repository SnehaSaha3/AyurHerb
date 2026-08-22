import { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/order";
import Company from "../models/company";
import Farmer from "../models/farmer";

const REVENUE_STATUSES = [
  "escrow_funded",
  "shipment_released",
  "delivery_released",
];

const RANGE_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

function resolveRangeStart(range: string): Date | null {
  const days = RANGE_DAYS[range] ?? 30;

  if (days === null) return null;

  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return start;
}

/* ============================================================
   FARMER ANALYTICS
   GET /api/farmers/analytics?range=30d
============================================================ */

export async function getFarmerAnalytics(req: any, res: Response) {
  try {
    const farmerId = req.user?.farmerId;

    if (!farmerId) {
      return res.status(401).json({
        success: false,
        error: "Could not resolve farmer identity",
      });
    }

    const range =
      typeof req.query.range === "string" ? req.query.range : "30d";

    const rangeStart = resolveRangeStart(range);

    const farmerObjectId = new mongoose.Types.ObjectId(farmerId);

    const baseMatch: any = { farmerId: farmerObjectId };

    if (rangeStart) {
      baseMatch.createdAt = { $gte: rangeStart };
    }

    const [result] = await Order.aggregate([
      { $match: baseMatch },
      {
        $facet: {
          summary: [
            { $match: { status: { $in: REVENUE_STATUSES } } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$amount" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$amount" },
              },
            },
          ],

          allOrdersCount: [{ $count: "count" }],

          statusBreakdown: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],

          revenueOverTime: [
            { $unwind: "$tranches" },
            { $match: { "tranches.status": "released" } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$tranches.releasedAt",
                  },
                },
                revenue: { $sum: "$tranches.amount" },
                tranches: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          topCrops: [
            { $match: { status: { $in: REVENUE_STATUSES } } },
            {
              $group: {
                _id: "$cropName",
                revenue: { $sum: "$amount" },
                quantity: { $sum: "$quantity" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 6 },
          ],

          topBuyers: [
            { $match: { status: { $in: REVENUE_STATUSES } } },
            {
              $group: {
                _id: "$companyId",
                revenue: { $sum: "$amount" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 6 },
          ],

          blockchain: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                confirmedOnChain: {
                  $sum: {
                    $cond: [{ $ifNull: ["$chainTxHash", false] }, 1, 0],
                  },
                },
                escrowLoggedOnChain: {
                  $sum: {
                    $cond: [
                      { $ifNull: ["$escrow.escrowChainTxHash", false] },
                      1,
                      0,
                    ],
                  },
                },
                pendingAdminReview: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "pending_admin_review"] },
                      1,
                      0,
                    ],
                  },
                },
                flaggedByFraudAgent: {
                  $sum: {
                    $cond: [
                      { $eq: ["$fraudCheck.requiresAdminReview", true] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],

          tranches: [
            { $unwind: "$tranches" },
            {
              $group: {
                _id: "$tranches.status",
                count: { $sum: 1 },
                amount: { $sum: "$tranches.amount" },
              },
            },
          ],
        },
      },
    ]);

    const buyerIds = (result.topBuyers || [])
      .map((b: any) => b._id)
      .filter(Boolean);

    const buyers = buyerIds.length
      ? await Company.find({ _id: { $in: buyerIds } })
          .select("name")
          .lean()
      : [];

    const buyerNameById = new Map(
      buyers.map((b: any) => [b._id.toString(), b.name])
    );

    const summary = result.summary?.[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
    };

    const blockchain = result.blockchain?.[0] || {
      totalOrders: 0,
      confirmedOnChain: 0,
      escrowLoggedOnChain: 0,
      pendingAdminReview: 0,
      flaggedByFraudAgent: 0,
    };

    return res.json({
      success: true,
      range,

      summary: {
        totalRevenue: summary.totalRevenue || 0,
        totalOrders: summary.totalOrders || 0,
        avgOrderValue: Math.round(summary.avgOrderValue || 0),
        allOrdersCount: result.allOrdersCount?.[0]?.count || 0,
      },

      statusBreakdown: (result.statusBreakdown || []).map((s: any) => ({
        status: s._id,
        count: s.count,
      })),

      revenueOverTime: (result.revenueOverTime || []).map((r: any) => ({
        date: r._id,
        revenue: r.revenue,
        tranches: r.tranches,
      })),

      topCrops: (result.topCrops || []).map((c: any) => ({
        cropName: c._id,
        revenue: c.revenue,
        quantity: c.quantity,
        orders: c.orders,
      })),

      topBuyers: (result.topBuyers || []).map((b: any) => ({
        id: b._id?.toString(),
        name: buyerNameById.get(b._id?.toString()) || "Unknown buyer",
        revenue: b.revenue,
        orders: b.orders,
      })),

      blockchain: {
        totalOrders: blockchain.totalOrders || 0,
        confirmedOnChain: blockchain.confirmedOnChain || 0,
        escrowLoggedOnChain: blockchain.escrowLoggedOnChain || 0,
        pendingAdminReview: blockchain.pendingAdminReview || 0,
        flaggedByFraudAgent: blockchain.flaggedByFraudAgent || 0,
      },

      tranches: (result.tranches || []).map((t: any) => ({
        status: t._id,
        count: t.count,
        amount: t.amount,
      })),
    });
  } catch (error: any) {
    console.error("Farmer analytics error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch farmer analytics",
    });
  }
}

/* ============================================================
   COMPANY ANALYTICS
   GET /api/companies/analytics?range=30d
============================================================ */

export async function getCompanyAnalytics(req: any, res: Response) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: "Could not resolve company identity",
      });
    }

    const range =
      typeof req.query.range === "string" ? req.query.range : "30d";

    const rangeStart = resolveRangeStart(range);

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    const baseMatch: any = { companyId: companyObjectId };

    if (rangeStart) {
      baseMatch.createdAt = { $gte: rangeStart };
    }

    // Actual amount paid: prefer the GST-inclusive grand total, fall back
    // to what Razorpay captured, fall back to the crop subtotal for
    // orders that never reached payment.
    const spendExpr = {
      $ifNull: [
        "$fees.grandTotal",
        {
          $ifNull: [
            { $divide: ["$escrow.amountPaidPaise", 100] },
            "$amount",
          ],
        },
      ],
    };

    const [result] = await Order.aggregate([
      { $match: baseMatch },
      { $addFields: { spendAmount: spendExpr } },
      {
        $facet: {
          summary: [
            { $match: { status: { $in: REVENUE_STATUSES } } },
            {
              $group: {
                _id: null,
                totalSpend: { $sum: "$spendAmount" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$spendAmount" },
              },
            },
          ],

          allOrdersCount: [{ $count: "count" }],

          statusBreakdown: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],

          spendOverTime: [
            { $match: { "escrow.fundedAt": { $ne: null } } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$escrow.fundedAt",
                  },
                },
                spend: { $sum: "$spendAmount" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          topCrops: [
            { $match: { status: { $in: REVENUE_STATUSES } } },
            {
              $group: {
                _id: "$cropName",
                spend: { $sum: "$spendAmount" },
                quantity: { $sum: "$quantity" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { spend: -1 } },
            { $limit: 6 },
          ],

          topFarmers: [
            { $match: { status: { $in: REVENUE_STATUSES } } },
            {
              $group: {
                _id: "$farmerId",
                spend: { $sum: "$spendAmount" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { spend: -1 } },
            { $limit: 6 },
          ],

          blockchain: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                confirmedOnChain: {
                  $sum: {
                    $cond: [{ $ifNull: ["$chainTxHash", false] }, 1, 0],
                  },
                },
                escrowLoggedOnChain: {
                  $sum: {
                    $cond: [
                      { $ifNull: ["$escrow.escrowChainTxHash", false] },
                      1,
                      0,
                    ],
                  },
                },
                pendingAdminReview: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "pending_admin_review"] },
                      1,
                      0,
                    ],
                  },
                },
                flaggedByFraudAgent: {
                  $sum: {
                    $cond: [
                      { $eq: ["$fraudCheck.requiresAdminReview", true] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    const farmerIds = (result.topFarmers || [])
      .map((f: any) => f._id)
      .filter(Boolean);

    const farmers = farmerIds.length
      ? await Farmer.find({ _id: { $in: farmerIds } })
          .select("name address herb")
          .lean()
      : [];

    const farmerById = new Map(
      farmers.map((f: any) => [f._id.toString(), f])
    );

    const summary = result.summary?.[0] || {
      totalSpend: 0,
      totalOrders: 0,
      avgOrderValue: 0,
    };

    const blockchain = result.blockchain?.[0] || {
      totalOrders: 0,
      confirmedOnChain: 0,
      escrowLoggedOnChain: 0,
      pendingAdminReview: 0,
      flaggedByFraudAgent: 0,
    };

    return res.json({
      success: true,
      range,

      summary: {
        totalSpend: Math.round(summary.totalSpend || 0),
        totalOrders: summary.totalOrders || 0,
        avgOrderValue: Math.round(summary.avgOrderValue || 0),
        allOrdersCount: result.allOrdersCount?.[0]?.count || 0,
      },

      statusBreakdown: (result.statusBreakdown || []).map((s: any) => ({
        status: s._id,
        count: s.count,
      })),

      spendOverTime: (result.spendOverTime || []).map((s: any) => ({
        date: s._id,
        spend: Math.round(s.spend),
        orders: s.orders,
      })),

      topCrops: (result.topCrops || []).map((c: any) => ({
        cropName: c._id,
        spend: Math.round(c.spend),
        quantity: c.quantity,
        orders: c.orders,
      })),

      topFarmers: (result.topFarmers || []).map((f: any) => {
        const farmer = farmerById.get(f._id?.toString());

        return {
          id: f._id?.toString(),
          name: farmer?.name || "Unknown farmer",
          herb: farmer?.herb || "",
          spend: Math.round(f.spend),
          orders: f.orders,
        };
      }),

      blockchain: {
        totalOrders: blockchain.totalOrders || 0,
        confirmedOnChain: blockchain.confirmedOnChain || 0,
        escrowLoggedOnChain: blockchain.escrowLoggedOnChain || 0,
        pendingAdminReview: blockchain.pendingAdminReview || 0,
        flaggedByFraudAgent: blockchain.flaggedByFraudAgent || 0,
      },
    });
  } catch (error: any) {
    console.error("Company analytics error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch company analytics",
    });
  }
}