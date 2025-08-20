import mongoose, { Document, Schema } from "mongoose";

export interface IFarmer extends Document {
  name: string;
  contact: string;
  address: string;
  herb: string;
  image?: string;
}

const FarmerSchema: Schema = new Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  address: { type: String, required: true },
  herb: { type: String, required: true },
  image: { type: String },
});

export default mongoose.model<IFarmer>("farmer", FarmerSchema);
