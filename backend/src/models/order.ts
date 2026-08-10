import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus =
  | "pending_verification"
  | "verification_failed"
  | "pending_stock_check"
  | "insufficient_stock"
  | "awaiting_payment"
  | "paid"
  | "rejected";

export interface IOrder extends Document {
  companyId: mongoose.Types.ObjectId;
  farmerId: mongoose.Types.ObjectId;
  cropId: string;
  cropName: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
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
  createdAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    farmerId: { type: Schema.Types.ObjectId, ref: "Farmer", required: true },
    cropId: { type: String, required: true },
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: "pending_verification" },
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
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", orderSchema);