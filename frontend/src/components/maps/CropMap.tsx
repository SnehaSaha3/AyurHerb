import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

interface Crop {
  id: number;
  name: string;
  lat: number;
  lng: number;
  season: string;
  soil: string;
  farmerName?: string;
  farmerId?: string | null;
}

interface ApiCrop {
  id?: number | string;
  name?: string;
  cropName?: string;
  location?: { lat?: number | string; lng?: number | string };
  lat?: number | string;
  lng?: number | string;
  season?: string;
  soilType?: string;
  soil?: string;
  farmerName?: string;
  farmerId?: string;
}

export default function CropMap() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCrops = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/crops");
        if (isMounted) {
          const list: ApiCrop[] = Array.isArray(res.data.crops) ? res.data.crops : [];
          const parsed: Crop[] = list
            .map((c: ApiCrop, index: number) => ({
              id: Number(c.id ?? index),
              name: c.cropName ?? c.name ?? "🌱 Unknown Crop",
              lat: Number(c.location?.lat ?? c.lat),
              lng: Number(c.location?.lng ?? c.lng),
              season: c.season ?? "🌞 Unknown",
              soil: c.soilType ?? c.soil ?? "🪨 Unknown",
              farmerName: c.farmerName ?? "👨‍🌾 Unknown",
              farmerId: c.farmerId ?? null,
            }))
            .filter((c) => !isNaN(c.lat) && !isNaN(c.lng));

          setCrops(parsed);
        }
      } catch (err) {
        console.error("Error fetching crops:", err);
        if (isMounted) setCrops([]);
      }
    };

    fetchCrops();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="w-full h-[600px] relative">
      <MapContainer center={[26.2, 92.93]} zoom={8} className="w-full h-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {crops.map((crop) => (
          <Marker key={crop.id} position={[crop.lat, crop.lng]}>
            <Popup>
              <div className="w-72 p-4 bg-white rounded-xl shadow-lg border border-gray-200 space-y-2">
                <h3 className="text-lg font-bold">🌾 {crop.name}</h3>
                <div>🌞 <span className="font-semibold">Season:</span> {crop.season}</div>
                <div>🪴 <span className="font-semibold">Soil:</span> {crop.soil}</div>
                <div className="text-sm text-gray-500">📍 Lat: {crop.lat}, Lng: {crop.lng}</div>
                {crop.farmerName && crop.farmerId && (
                  <div>
                    👨‍🌾 <span className="font-semibold">Farmer:</span> {crop.farmerName}
                    <button
                      onClick={() => setSelectedFarmerId(crop.farmerId ?? null)}
                      className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      View Farmer
                    </button>
                  </div>
                )}
                
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {crops.length === 0 && (
        <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded shadow">
          Loading crops...
        </div>
      )}

      {selectedFarmerId && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 space-y-4">
            <h2 className="text-xl font-bold mb-2">👨‍🌾 Farmer Details</h2>
            <p><span className="font-semibold">Farmer ID:</span> {selectedFarmerId}</p>
            {/* Optionally fetch more farmer details */}
            <button
              onClick={() => setSelectedFarmerId(null)}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
