import axios from "axios";
import type { CropSummary } from "../farmer/FarmContext";

export interface FarmerLocation {
  latitude?: number;
  longitude?: number;
  area?: string;
  village?: string;
  district?: string;
  state?: string;
  country?: string;
}

export interface FarmerWeather {
  temp?: number;
  description?: string;
  rainChance?: number;
  humidity?: number;
  windSpeed?: number;
}

export interface FarmerContext {
  crops?: CropSummary[];
  location?: FarmerLocation;
  moisture?: number;
  weather?: FarmerWeather;
}

export interface AyurMateDecision {
  action: string;
  priority: "low" | "medium" | "high";
  crop: string | null;
  title: string;
  message: string;
  reason: string[];
  next_steps: string[];
}

export interface AyurMateResponse {
  agent: string;
  decision: AyurMateDecision;
}

const AYURMATE_API =
  import.meta.env.VITE_AYURMATE_API_URL ||
  "https://ayurherb-chatbot.onrender.com";

export async function askChatbot(
  question: string,
  farmer: FarmerContext = {},
): Promise<AyurMateResponse> {
  const response = await axios.post<AyurMateResponse>(
    `${AYURMATE_API}/query`,
    {
      question,
      farmer,
    },
    {
      timeout: 60000,
    },
  );

  return response.data;
}