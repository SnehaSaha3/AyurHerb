import mongoose, { Schema, Document } from "mongoose"
import { v4 as uuidv4 } from "uuid"
import cropSchema, { ICrop } from "./crop"

export interface IFarmer extends Document {
  _id: mongoose.Types.ObjectId
  farmerId: string
  name: string
  contact: string
  email: string
  address: string
  herb: string
  walletAddress: string
  privateKey: string
  lat?: string   // ✅ Added latitude
  lng?: string   // ✅ Added longitude
  crops?: ICrop[]
}

const farmerSchema = new Schema<IFarmer>({
  farmerId: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  herb: { type: String, required: true },
  walletAddress: { type: String, required: false, unique: true },   // ✅ wallet
  privateKey: { type: String, required: false },                   // ✅ private key
  lat: { type: String, required: false },  // ✅ Added latitude field
  lng: { type: String, required: false },  // ✅ Added longitude field
  crops: [cropSchema],
})

export default mongoose.model<IFarmer>("Farmer", farmerSchema)