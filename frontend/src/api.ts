import axios from "axios"

const API = axios.create({
  baseURL: "https://ayurherb-backend-7yw4.onrender.com/api/crops", // ✅ fixed
})

export interface CropData {
  cropName: string
  location: { lat: number; lng: number }
  season?: string
  soilType?: string
}

export const registerCrop = async (data: CropData) => {
  return API.post("/add", data)  
}


