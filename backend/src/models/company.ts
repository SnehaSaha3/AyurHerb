import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  email: string;
  password: string;
  contact?: string;
  address?: string;
  createdAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    contact: { type: String },
    address: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", companySchema);