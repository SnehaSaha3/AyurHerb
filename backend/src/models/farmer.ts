import mongoose, { Schema, Document } from "mongoose"
import { v4 as uuidv4 } from "uuid"

interface IFarmer extends Document {
  _id: mongoose.Types.ObjectId   
  farmerId: string
  name: string
  contact: string
  email:string
  address: string
  herb: string
  __v?: number
}

const farmerSchema = new Schema<IFarmer>({
  farmerId: { type: String, default: uuidv4 }, 
  name: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  herb: { type: String, required: true },
});

export default mongoose.model<IFarmer>("Farmer", farmerSchema)

