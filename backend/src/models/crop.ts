import mongoose, { Schema, Document } from "mongoose"
import { v4 as uuidv4 } from "uuid"

export interface ICrop extends Document {
  cropId: string
  cropName: string
  location: { lat: number; lng: number }
  season?: string
  soilType?: string
  createdAt?: Date
}

const cropSchema = new Schema<ICrop>({
  cropId: { type: String, default: uuidv4 },
  cropName: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  season: { type: String },
  soilType: { type: String },
  createdAt: { type: Date, default: Date.now },
})

export const Crop = mongoose.model<ICrop>("Crop", cropSchema)
export default cropSchema