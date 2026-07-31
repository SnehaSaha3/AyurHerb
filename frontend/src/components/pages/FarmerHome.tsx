import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ChatbotCard from "../ChatbotCard";
import WeatherCard, { type WeatherData } from "../services/Weather";
import {
  Sprout,
  MapPinned,
  Droplets,
  CloudSun,
} from "lucide-react";

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

  const [farmLocation, setFarmLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherData>();

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(
          "http://localhost:8000/api/crops/mine",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const allCrops = Array.isArray(res.data.crops)
          ? res.data.crops
          : [];

        setCrops(allCrops);

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

  const avgMoisture = useMemo(() => {
    if (!crops.length) return 0;

    const values = crops
      .map((c) => c.moisture || 0);

    return Math.round(
      values.reduce((a, b) => a + b, 0) /
        values.length
    );
  }, [crops]);

  const geoTagged = useMemo(() => {
    return crops.filter((c) => c.location).length;
  }, [crops]);

  return (
    <div className="space-y-6">

      {/* Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total Crops
              </p>
              <h2 className="text-3xl font-bold mt-2">
                {crops.length}
              </h2>
            </div>

            <Sprout className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Geo Tagged
              </p>
              <h2 className="text-3xl font-bold mt-2">
                {geoTagged}
              </h2>
            </div>

            <MapPinned className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Avg Moisture
              </p>
              <h2 className="text-3xl font-bold mt-2">
                {avgMoisture}%
              </h2>
            </div>

            <Droplets className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Temperature
              </p>
              <h2 className="text-3xl font-bold mt-2">
                {weatherData?.temp ?? "--"}°
              </h2>
            </div>

            <CloudSun className="text-yellow-500" size={32} />
          </div>
        </div>

      </div>

      {/* Main */}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left */}

        <div className="lg:col-span-2 space-y-6">

          {/* Crops */}

          <div className="bg-white rounded-xl border shadow-sm p-5">

            <h2 className="text-lg font-semibold mb-4">
              Recent Crops
            </h2>

            {loading ? (
              <p>Loading...</p>
            ) : crops.length === 0 ? (
              <p className="text-gray-500">
                No crops added yet.
              </p>
            ) : (
              <div className="space-y-4">
                {crops.slice(0, 4).map((crop) => (
                  <div
                    key={crop.cropId}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between">

                      <div>

                        <h3 className="font-semibold">
                          🌿 {crop.cropName}
                        </h3>

                        <p className="text-sm text-gray-500">
                          {crop.season || "Season N/A"} •{" "}
                          {crop.stage || "Growing"}
                        </p>

                      </div>

                      <span className="text-sm text-green-700 font-medium">
                        {crop.moisture ?? 0}%
                      </span>

                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">

                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${crop.moisture ?? 0}%`,
                        }}
                      />

                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* Right */}

        <div className="space-y-6">

          {farmLocation && (
            <div className="bg-white rounded-xl border shadow-sm p-5">

              <h2 className="text-lg font-semibold mb-4">
                Weather
              </h2>

              <WeatherCard
                lat={farmLocation.lat}
                lng={farmLocation.lng}
                setWeatherData={setWeatherData}
              />

            </div>
          )}

          <div className="bg-white rounded-xl border shadow-sm h-[500px] flex flex-col">

            <div className="border-b p-4">

              <h2 className="font-semibold">
                🤖 AyurMate AI
              </h2>

              <p className="text-sm text-gray-500">
                Your farming assistant
              </p>

            </div>

            <div className="flex-1 overflow-y-auto p-4">

              <ChatbotCard
                farmLocation={farmLocation}
                weatherData={weatherData}
              />

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}