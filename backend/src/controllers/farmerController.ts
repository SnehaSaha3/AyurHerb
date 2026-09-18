import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Farmer from "../models/farmer";
import Order from "../models/order";
import Message from "../models/message";
import Company from "../models/company";
import { Crop } from "../models/crop";
import { sendRegistrationEmail } from "../services/EmailService";
import { ethers } from "ethers";
import { encryptPrivateKey } from "../utils/walletCrypto";
import { upsertCropOnChain } from "./cropController";

/* ============================================================
   FARMER REGISTER
============================================================ */

export const registerFarmer = async (
  req: Request,
  res: Response
) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is not defined in environment variables"
      );
    }

    const {
      name,
      contact,
      email,
      password,
      address,
      herb,
      soilType,
      season,
      quantity,
      lat,
      lng,
    } = req.body;

    if (!name || !email || !password || !herb) {
      return res.status(400).json({
        error:
          "name, email, password & herb are required",
      });
    }

    if (
      quantity === undefined ||
      quantity === null ||
      isNaN(Number(quantity)) ||
      Number(quantity) < 0
    ) {
      return res.status(400).json({
        error:
          "quantity is required and must be a non-negative number",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const existing = await Farmer.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      return res.status(409).json({
        error:
          "A farmer with this email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const wallet =
      ethers.Wallet.createRandom();

    const parsedLat =
      lat !== undefined &&
      lat !== null &&
      lat !== ""
        ? Number(lat)
        : null;

    const parsedLng =
      lng !== undefined &&
      lng !== null &&
      lng !== ""
        ? Number(lng)
        : null;

    const hasValidLocation =
      parsedLat !== null &&
      parsedLng !== null &&
      !Number.isNaN(parsedLat) &&
      !Number.isNaN(parsedLng);

    let startingCropId = "";

    if (hasValidLocation) {
      try {
        const { cropId } = await upsertCropOnChain({
          farmerAddr: wallet.address,
          name: herb,
          area: "N/A",
          season: season || "",
          soil: soilType || "",
          lat: parsedLat as number,
          lng: parsedLng as number,
        });

        startingCropId = cropId?.toString() || "";
      } catch (chainErr: any) {
        console.error(
          "Failed to register starting crop on chain:",
          chainErr.message
        );
      }
    }

    const newFarmer = new Farmer({
      name,
      contact,
      email: normalizedEmail,
      password: hashedPassword,
      address,
      herb,

      walletAddress: wallet.address,

      privateKey:
        encryptPrivateKey(
          wallet.privateKey
        ),

      lat: hasValidLocation
        ? String(parsedLat)
        : undefined,

      lng: hasValidLocation
        ? String(parsedLng)
        : undefined,

      crops: hasValidLocation
        ? [
            new Crop({
              cropId: startingCropId,
              cropName: herb,
              soilType: soilType || "-",
              season: season || "-",
              quantity: Number(quantity),
              location: {
                lat: parsedLat,
                lng: parsedLng,
              },
            }),
          ]
        : [],
    });

    await newFarmer.save();

    await sendRegistrationEmail(
      normalizedEmail,
      name
    );

    const token = jwt.sign(
      {
        farmerId: newFarmer._id,
        walletAddress:
          newFarmer.walletAddress,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const {
      password: _password,
      privateKey: _privateKey,
      ...safeFarmer
    } = newFarmer.toObject();

    return res.status(201).json({
      success: true,
      message:
        "Farmer registered successfully",
      farmer: safeFarmer,
      token,
      locationCaptured:
        hasValidLocation,
    });
  } catch (error) {
    console.error(
      "Registration Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Failed to register farmer",
    });
  }
};

/* ============================================================
   FARMER LOGIN
============================================================ */

export const loginFarmer = async (
  req: Request,
  res: Response
) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is not defined in environment variables"
      );
    }

    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error:
          "email & password are required",
      });
    }

    const farmer =
      await Farmer.findOne({
        email:
          email.toLowerCase().trim(),
      });

    if (!farmer) {
      return res.status(404).json({
        error:
          "No farmer found with this email",
      });
    }

    const validPassword =
      await bcrypt.compare(
        password,
        farmer.password
      );

    if (!validPassword) {
      return res.status(401).json({
        error:
          "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        farmerId: farmer._id,
        walletAddress:
          farmer.walletAddress,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const {
      password: _password,
      privateKey: _privateKey,
      ...safeFarmer
    } = farmer.toObject();

    return res.json({
      success: true,
      message:
        "Login successful",
      farmer: safeFarmer,
      token,
    });
  } catch (error) {
    console.error(
      "Farmer Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Failed to log in",
    });
  }
};

/* ============================================================
   GET CURRENT FARMER
   GET /api/farmers/me
============================================================ */

export const getCurrentFarmer = async (
  req: any,
  res: Response
) => {
  try {
    const farmerId =
      req.user?.farmerId;

    if (!farmerId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const farmer =
      await Farmer.findById(
        farmerId
      ).select(
        "-password -privateKey"
      );

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error:
          "Farmer not found",
      });
    }

    return res.json({
      success: true,
      farmer,
    });
  } catch (error) {
    console.error(
      "Get current farmer error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

/* ============================================================
   FARMER BUSINESS ACTIVITY
   GET /api/farmers/activity
============================================================ */

interface Activity {
  id: string;

  type:
    | "payment"
    | "message"
    | "invoice"
    | "shipment";

  title: string;

  description: string;

  time: Date | string;

  orderId?: string;
  invoice?: {
  invoiceNumber: string;
  invoicePdfBase64?: string;
  };

  payment?: {
    amount: number;
    currency: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };

  shipment?: {
    amount: number;
    percent: number;
    status: string;
  };

  message?: {
    senderId: string;
    senderName: string;
  };
};

export const getFarmerActivity = async (
  req: any,
  res: Response
) => {
  try {
    const farmerId =
      req.user?.farmerId;

    if (!farmerId) {
      return res.status(401).json({
        success: false,
        error:
          "Could not resolve farmer identity",
      });
    }

    const orders =
      await Order.find({
        farmerId,
      })
        .populate(
          "companyId",
          "name"
        )
        .sort({
          updatedAt: -1,
        })
        .limit(20)
        .lean();

    const activities: Activity[] = [];

    for (
      const order of orders as any[]
    ) {
      const orderId =
        order._id.toString();

      const companyName =
        order.companyId?.name ||
        "A buyer";

      if (
        order.escrow?.fundedAt
      ) {
        let paymentAmount =
          order.fees?.grandTotal;

        if (
          paymentAmount ===
            undefined ||
          paymentAmount === null
        ) {
          if (
            order.escrow
              ?.amountPaidPaise !==
              undefined &&
            order.escrow
              ?.amountPaidPaise !==
              null
          ) {
            paymentAmount =
              order.escrow
                .amountPaidPaise / 100;
          } else {
            paymentAmount =
              order.amount || 0;
          }
        }

        activities.push({
          id:
            `payment-${orderId}`,

          type: "payment",

          title:
            "Escrow payment received",

          description:
            `₹${Number(
              paymentAmount
            ).toLocaleString(
              "en-IN"
            )} payment received from ` +
            `${companyName} for ` +
            `${order.cropName}.`,

          time:
            order.escrow
              .fundedAt,

          orderId,

          payment: {
            amount:
              Number(
                paymentAmount
              ),

            currency: "INR",

            razorpayOrderId:
              order.escrow
                .razorpayOrderId,

            razorpayPaymentId:
              order.escrow
                .razorpayPaymentId,
          },
        });
      }

      /* ======================================================
         2. INVOICE
      ====================================================== */

      if (
  order.invoice
    ?.generatedAt &&
  order.invoice
    ?.invoiceNumber &&
  order.invoice?.invoicePdfBase64
) {
  activities.push({
    id:
      `invoice-${orderId}`,

    type: "invoice",

    title:
      "Invoice generated",

    description:
      `Invoice ${order.invoice.invoiceNumber} ` +
      `is ready to view.`,

    time:
      order.invoice
        .generatedAt,

    orderId,

    invoice: {
      invoiceNumber:
        order.invoice
          .invoiceNumber,

      invoicePdfBase64:
        order.invoice
          .invoicePdfBase64,
    },
  });
}

      /* ======================================================
         3. SHIPMENT TRANCHE
      ====================================================== */

      const shipmentTranche =
        order.tranches?.find(
          (tranche: any) =>
            tranche.type ===
              "shipment" &&
            tranche.status ===
              "released"
        );

      if (
        shipmentTranche
          ?.releasedAt
      ) {
        activities.push({
          id:
            `shipment-${orderId}`,

          type: "shipment",

          title:
            "Shipment payment released",

          description:
            `₹${Number(
              shipmentTranche.amount
            ).toLocaleString(
              "en-IN"
            )} ` +
            `(${shipmentTranche.percent}%) ` +
            `released for shipment of ` +
            `${order.cropName}.`,

          time:
            shipmentTranche
              .releasedAt,

          orderId,

          shipment: {
            amount:
              Number(
                shipmentTranche.amount
              ),

            percent:
              Number(
                shipmentTranche.percent
              ),

            status:
              shipmentTranche.status,
          },
        });
      }

      /* ======================================================
         4. DELIVERY TRANCHE
      ====================================================== */

      const deliveryTranche =
        order.tranches?.find(
          (tranche: any) =>
            tranche.type ===
              "delivery" &&
            tranche.status ===
              "released"
        );

      if (
        deliveryTranche
          ?.releasedAt
      ) {
        activities.push({
          id:
            `delivery-${orderId}`,

          /*
           * Keeping the existing Activity type instead
           * of introducing another frontend type.
           */
          type: "shipment",

          title:
            "Delivery payment released",

          description:
            `₹${Number(
              deliveryTranche.amount
            ).toLocaleString(
              "en-IN"
            )} ` +
            `(${deliveryTranche.percent}%) ` +
            `released after delivery.`,

          time:
            deliveryTranche
              .releasedAt,

          orderId,

          shipment: {
            amount:
              Number(
                deliveryTranche.amount
              ),

            percent:
              Number(
                deliveryTranche.percent
              ),

            status:
              deliveryTranche.status,
          },
        });
      }
    }

    /* ========================================================
       MESSAGES
    ======================================================== */

    const recentMessages =
      await Message.find({
        receiverId: farmerId,
        receiverType: "farmer",
        senderType: "company",
      })
        .sort({
          createdAt: -1,
        })
        .limit(10)
        .lean();

    const senderIds = [
      ...new Set(
        recentMessages.map(
          (message: any) =>
            message.senderId
        )
      ),
    ];

    const senders =
      senderIds.length > 0
        ? await Company.find({
            _id: {
              $in: senderIds,
            },
          })
            .select("name")
            .lean()
        : [];

    const senderNameById =
      new Map(
        senders.map(
          (company: any) => [
            company._id.toString(),
            company.name,
          ]
        )
      );

    for (
      const message of recentMessages as any[]
    ) {
      const senderId =
        message.senderId.toString();

      const senderName =
        senderNameById.get(
          senderId
        ) || "A buyer";

      activities.push({
        id:
          `message-${message._id}`,

        type: "message",

        title:
          "New message from buyer",

        description:
          `${senderName}: ` +
          `${String(
            message.text || ""
          ).slice(0, 80)}`,

        time:
          message.createdAt,

        message: {
          senderId,

          senderName,
        },
      });
    }

    /* ========================================================
       SORT ALL ACTIVITY
    ======================================================== */

    activities.sort(
      (a, b) =>
        new Date(
          b.time
        ).getTime() -
        new Date(
          a.time
        ).getTime()
    );

    /* ========================================================
       RESPONSE
    ======================================================== */

    return res.json({
      success: true,

      activities:
        activities.slice(0, 20),
    });
  } catch (err: any) {
    console.error(
      "Farmer activity error:",
      err
    );

    return res.status(500).json({
      success: false,
      error:
        "Failed to fetch activity",
    });
  }
};