import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus =
  | "pending_verification"
  | "verification_failed"
  | "pending_stock_check"
  | "insufficient_stock"
  | "awaiting_payment"        
  | "payment_processing"      
  | "escrow_funded"           
  | "pending_admin_review"    
  | "admin_held"              
  | "shipment_released"       
  | "delivery_released"       
  | "disputed"
  | "rejected";

export type TrancheType = "shipment" | "delivery";

export interface ITranche {
  type: TrancheType;
  percent: number;
  amount: number;
  releasedAt?: Date;
  chainTxHash?: string;   
  status: "pending" | "released";
}

export interface IOrder extends Document {
  companyId: mongoose.Types.ObjectId;
  farmerId: mongoose.Types.ObjectId;
  cropId: string;
  cropName: string;
  quantity: number;
  amount: number;   
  status: OrderStatus;

  
  fees?: {
    platformFeePercent: number;
    platformFeeAmount: number;
    transportationFeeAmount: number;
    gstOnFeesPercent: number;
    gstOnFeesAmount: number;
    grandTotal: number;   
    
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

  
  chainTxHash?: string;

 
  escrow: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    amountPaidPaise?: number;     
    currency: string;
    fundedAt?: Date;
    escrowChainTxHash?: string;   
  };

  
  
  fraudCheck?: {
    riskScore: number;
    requiresAdminReview: boolean;
    autoHold: boolean;
    reason: string;
    signals: Array<{ name: string; value: number; weight: number; note: string }>;
    checkedAt: Date;
  };

  
  adminReview?: {
    decision: "pending" | "approved" | "held";
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    notes?: string;
  };

  tranches: ITranche[];

  invoice?: {
    invoiceNumber: string;
    invoiceText: string;      
    invoicePdfBase64: string; 
    generatedAt: Date;
    qrToken: string;          
    qrCodeDataUrl: string;    
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