import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus =
  | "pending_verification"
  | "verification_failed"
  | "pending_stock_check"
  | "insufficient_stock"
  | "awaiting_payment"        // confirmed on-chain, Razorpay checkout not yet started
  | "payment_processing"      // Razorpay order created, waiting on checkout completion
  | "escrow_funded"           // payment captured + verified, sitting in platform's account
  | "pending_admin_review"    // fraud agent flagged — waiting on admin decision
  | "admin_held"              // admin explicitly held the release
  | "shipment_released"       // first tranche fired, farmer told to start shipment
  | "delivery_released"       // final tranche fired, order complete
  | "disputed"
  | "rejected";

export type TrancheType = "shipment" | "delivery";

export interface ITranche {
  type: TrancheType;
  percent: number;
  amount: number;
  releasedAt?: Date;
  chainTxHash?: string;   // hash of {orderId, type, amount, timestamp} logged on-chain
  status: "pending" | "released";
}

export interface IOrder extends Document {
  companyId: mongoose.Types.ObjectId;
  farmerId: mongoose.Types.ObjectId;
  cropId: string;
  cropName: string;
  quantity: number;
  amount: number;   // crop subtotal — 100% owed to farmer, unchanged meaning from before
  status: OrderStatus;

  // ── Fee breakdown — computed server-side at payment creation, never
  // trusted from the client. See services/feeService.ts for the logic.
  fees?: {
    platformFeePercent: number;
    platformFeeAmount: number;
    transportationFeeAmount: number;
    gstOnFeesPercent: number;
    gstOnFeesAmount: number;
    grandTotal: number;   // what the company actually pays via Razorpay
  };

  verification: {
    passed: boolean;
    gstNumber?: string;
    checkedAt?: Date;
    reason?: string;
  };
  stockCheck: {
    passed: boolean;
    checkedAt?: Date;
    reason?: string;
  };

  // On-chain hash logged once the order itself is confirmed (existing behavior)
  chainTxHash?: string;

  // ── Razorpay escrow (TEST MODE — see razorpayService.ts) ──────────
  escrow: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    amountPaidPaise?: number;      // Razorpay works in paise, kept exact
    currency: string;
    fundedAt?: Date;
    escrowChainTxHash?: string;    // hash of payment details, logged on-chain
  };

  // ── Fraud agent output — admin sees THIS, never raw payment fields ─
  fraudCheck?: {
    riskScore: number;
    requiresAdminReview: boolean;
    autoHold: boolean;
    reason: string;
    signals: Array<{ name: string; value: number; weight: number; note: string }>;
    checkedAt: Date;
  };

  // ── Admin decision ──────────────────────────────────────────────
  adminReview?: {
    decision: "pending" | "approved" | "held";
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    notes?: string;
  };

  tranches: ITranche[];

  invoice?: {
    invoiceNumber: string;
    invoiceText: string;      // short AI-written note, shown in-app
    invoicePdfBase64: string; // branded PDF from the invoice agent — store in
                               // Mongo for the demo; swap for S3/cloud storage
                               // + a URL reference before this goes past demo scale
    generatedAt: Date;
    qrToken: string;          // random token, part of the public verify URL
    qrCodeDataUrl: string;    // base64 PNG, printed on farmer's packs
  };

  createdAt: Date;
}

const trancheSchema = new Schema<ITranche>(
  {
    type: { type: String, enum: ["shipment", "delivery"], required: true },
    percent: { type: Number, required: true },
    amount: { type: Number, required: true },
    releasedAt: { type: Date },
    chainTxHash: { type: String },
    status: { type: String, enum: ["pending", "released"], default: "pending" },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    farmerId: { type: Schema.Types.ObjectId, ref: "Farmer", required: true },
    cropId: { type: String, required: true },
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: "pending_verification" },

    fees: {
      platformFeePercent: { type: Number },
      platformFeeAmount: { type: Number },
      transportationFeeAmount: { type: Number },
      gstOnFeesPercent: { type: Number },
      gstOnFeesAmount: { type: Number },
      grandTotal: { type: Number },
    },

    verification: {
      passed: { type: Boolean, default: false },
      gstNumber: { type: String },
      checkedAt: { type: Date },
      reason: { type: String },
    },
    stockCheck: {
      passed: { type: Boolean, default: false },
      checkedAt: { type: Date },
      reason: { type: String },
    },

    chainTxHash: { type: String },

    escrow: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      amountPaidPaise: { type: Number },
      currency: { type: String, default: "INR" },
      fundedAt: { type: Date },
      escrowChainTxHash: { type: String },
    },

    fraudCheck: {
      riskScore: { type: Number },
      requiresAdminReview: { type: Boolean },
      autoHold: { type: Boolean },
      reason: { type: String },
      signals: [
        {
          name: String,
          value: Number,
          weight: Number,
          note: String,
        },
      ],
      checkedAt: { type: Date },
    },

    adminReview: {
      decision: { type: String, enum: ["pending", "approved", "held"], default: "pending" },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
      reviewedAt: { type: Date },
      notes: { type: String },
    },

    tranches: { type: [trancheSchema], default: [] },

    invoice: {
     invoiceNumber: { type: String },
     invoiceText: { type: String },
     invoicePdfBase64: { type: String },
     generatedAt: { type: Date },
     qrToken: { type: String },
     qrCodeDataUrl: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", orderSchema);