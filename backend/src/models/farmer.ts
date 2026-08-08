import mongoose, { Schema, Document } from "mongoose"
import cropSchema, { ICrop } from "./crop"

export interface IFarmer extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  contact: string
  email: string
  password: string
  address: string
  herb: string
  walletAddress: string
  privateKey: string
  lat?: string
  lng?: string
  crops?: ICrop[]
}

const farmerSchema = new Schema<IFarmer>({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  herb: { type: String, required: true },
  walletAddress: { type: String, required: false, unique: true },
  privateKey: { type: String, required: false },
  lat: { type: String, required: false },
  lng: { type: String, required: false },
  crops: [cropSchema],
})

export default mongoose.model<IFarmer>("Farmer", farmerSchema)