import axios from "axios";

interface ChatbotContext {
  location?: string; 
  weather?: {
    temp?: number;
    description?: string;
    rainChance?: number;
    humidity?: number;
    windSpeed?: number;
  };
}
interface SatelliteData {
  moisture?: number;
  ndvi?: number;
  temperature?: number;
  [key: string]: number | undefined; // allow other numeric fields
}

export async function askChatbot(question: string, context?: ChatbotContext) {
  try {
    const res = await axios.post("http://localhost:8000/query", { question, context });
    return res.data.answer;
  } catch (err) {
    console.error("Chatbot error:", err);
    return "Error connecting to chatbot.";
  }
}

export async function getRecommendations(location: string, satelliteData?: SatelliteData) {
  try {
    const res = await axios.post("http://localhost:8000/recommend", { location, satellite_data: satelliteData });
    return res.data.answer;
  } catch (err) {
    console.error("Recommendation error:", err);
    return "Error fetching recommendations.";
  }
}
