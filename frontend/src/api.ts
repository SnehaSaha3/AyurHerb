import axios from "axios"

const API = axios.create({
  baseURL: "http://localhost:8000/api/crops", // ✅ fixed
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


