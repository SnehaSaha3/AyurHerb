import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  email: string;
  password: string;
  contact?: string;
  address?: string;
  walletAddress?: string;
  privateKey?: string;
  createdAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    contact: { type: String },
    address: { type: String },
    walletAddress: { type: String, unique: true, sparse: true },
    privateKey: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", companySchema);