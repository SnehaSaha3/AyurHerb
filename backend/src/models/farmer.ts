import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid"

interface IFarmer extends Document {
  farmerId: string;
  name: string;
  contact: string;
  address: string;
  herb: string;
}

const farmerSchema = new Schema<IFarmer>({
  farmerId: { type: String, default: uuidv4 }, 
  name: { type: String, required: true },
  contact: { type: String, required: true },
  address: { type: String, required: true },
  herb: { type: String, required: true },
});

export default mongoose.model<IFarmer>("Farmer", farmerSchema);
