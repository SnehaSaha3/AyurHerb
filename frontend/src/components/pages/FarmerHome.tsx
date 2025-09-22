import { useEffect, useState } from "react";
import axios from "axios";
import ChatbotCard from "../ChatbotCard";
import WeatherCard, { type WeatherData } from "../services/Weather";

interface CropSummary {
  cropId: string;
  cropName: string;
  season?: string;
  stage?: string;
  moisture?: number;
  source?: string;
  location?: { lat: number; lng: number };
}

export default function FarmerHome() {
  const [crops, setCrops] = useState<CropSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmLocation, setFarmLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | undefined>(undefined);

  useEffect(() => {
  const fetchCrops = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("http://localhost:5000/api/crops/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allCrops: CropSummary[] = Array.isArray(res.data.crops) ? res.data.crops : [];
      setCrops(allCrops.slice(0, 3));

      if (allCrops[0]?.location) setFarmLocation(allCrops[0].location);
    } catch {
      console.error("Error fetching crops");
    } finally {
      setLoading(false);
    }
  };
  fetchCrops();
}, []);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-green-700">👩‍🌾 Welcome back, Farmer!</h1>

      {/* Responsive layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left panel: Crops & Weather */}
        <div className="flex flex-col gap-6 lg:w-1/3">
          {/* Crop cards */}
          <div className="space-y-4">
            {loading ? (
              <p>Loading crops...</p>
            ) : crops.length === 0 ? (
              <p>No crops registered yet 🌱</p>
            ) : (
              crops.map((c) => (
                <div
                  key={c.cropId}
                  className="p-4 rounded-xl shadow-md bg-gradient-to-r from-green-50 to-green-100 hover:scale-105 transition-transform"
                >
                  <h3 className="font-semibold text-lg mb-1">🌾 {c.cropName}</h3>
                  <p className="text-sm text-gray-700">🌿 Season: {c.season || "—"}</p>
                  <p className="text-sm text-gray-700">🌱 Stage: {c.stage || "Sowing"}</p>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">💧 Moisture:</span>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${c.moisture ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Weather card */}
          {farmLocation && (
            <WeatherCard
              lat={farmLocation.lat}
              lng={farmLocation.lng}
              setWeatherData={setWeatherData}
            />
          )}
        </div>

        {/* Right panel: Chatbot */}
        <div className="lg:w-2/3">
          <ChatbotCard farmLocation={farmLocation} weatherData={weatherData} />
        </div>
      </div>
    </div>
  );
}
