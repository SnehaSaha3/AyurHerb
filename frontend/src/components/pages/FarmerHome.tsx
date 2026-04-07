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
  location?: { lat: number; lng: number };
}

export default function FarmerHome() {
  const [crops, setCrops] = useState<CropSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmLocation, setFarmLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData>();

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get("http://localhost:8000/api/crops/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const allCrops = Array.isArray(res.data.crops) ? res.data.crops : [];
        setCrops(allCrops.slice(0, 3));

        if (allCrops[0]?.location) {
          setFarmLocation(allCrops[0].location);
        }
      } catch {
        console.error("Error fetching crops");
      } finally {
        setLoading(false);
      }
    };

    fetchCrops();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

      {/* LEFT */}
      <div className="lg:col-span-1 space-y-6">

        {/* Crops */}
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h2 className="text-xs text-gray-500 mb-3 uppercase tracking-wide">
            Your Crops
          </h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : crops.length === 0 ? (
            <p className="text-sm text-gray-400">No crops yet</p>
          ) : (
            <div className="space-y-3">
              {crops.map((c) => (
                <div
                  key={c.cropId}
                  className="p-3 border rounded-lg hover:shadow-sm transition"
                >
                  <p className="text-sm font-medium text-gray-800">
                    {c.cropName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {c.season || "—"} • {c.stage || "Sowing"}
                  </p>

                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full">
                    <div
                      className="h-1.5 bg-green-500 rounded-full"
                      style={{ width: `${c.moisture ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weather */}
        {farmLocation && (
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <h2 className="text-xs text-gray-500 mb-3 uppercase tracking-wide">
              Weather
            </h2>

            <WeatherCard
              lat={farmLocation.lat}
              lng={farmLocation.lng}
              setWeatherData={setWeatherData}
            />
          </div>
        )}

      </div>

      {/* RIGHT - CHAT */}
      <div className="lg:col-span-3 flex flex-col">

        <div className="bg-white rounded-xl border shadow-sm flex flex-col h-full">

          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="w-8 h-8 bg-green-600 text-white flex items-center justify-center rounded-full text-sm font-bold">
              A
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                AyurMate
              </p>
              <p className="text-xs text-gray-500">
                AI Assistant
              </p>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-y-auto p-4">
            <ChatbotCard
              farmLocation={farmLocation}
              weatherData={weatherData}
            />
          </div>

        </div>
      </div>

    </div>
  );
}