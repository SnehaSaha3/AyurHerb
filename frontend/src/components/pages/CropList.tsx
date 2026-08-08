import { useEffect, useState } from "react";
import axios from "axios";

interface Crop {
  _id?: string;
  cropId?: string;
  cropName: string;
  soilType?: string;
  area?: number | string;
  location?: { lat: number; lng: number };
  season?: string;
  source?: string;
}

export default function CropList() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [newCropName, setNewCropName] = useState("");
  const [newSoilType, setNewSoilType] = useState("");
  const [newSeason, setNewSeason] = useState("");
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  // --- Fetch crops on load ---
  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
  setLoading(true);
  setError(null);

  try {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login first.");
      return;
    }

    const res = await axios.get(
      "http://localhost:8000/api/crops/mine",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setCrops(res.data.crops || []);
  } catch (err) {
    console.error(err);
    setError("Failed to load crops");
  } finally {
    setLoading(false);
  }
};

  // --- Get GPS location ---
  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported in your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => alert("Failed to fetch location: " + err.message)
    );
  };

  // --- Add crop ---
const addCrop = async () => {
  if (!newCropName || !gpsLocation) {
    alert("Please enter crop name and allow GPS location");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found.");

    const res = await axios.post(
      "http://localhost:8000/api/crops/add",
      {
        cropName: newCropName,
        soilType: newSoilType,
        season: newSeason,
        lat: gpsLocation.lat,
        lng: gpsLocation.lng,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setCrops((prev) => [
      ...prev,
      {
        cropId: res.data.cropId?.toString(),
        cropName: newCropName,
        soilType: newSoilType,
        season: newSeason,
        location: gpsLocation,
        source: "Blockchain",
      },
    ]);

    setNewCropName("");
    setNewSoilType("");
    setNewSeason("");
    setGpsLocation(null);
    setAdding(false);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      alert(error.response?.data?.error || "Failed to add crop");
    } else if (error instanceof Error) {
      alert(error.message);
    } else {
      alert("An unknown error occurred");
    }
    console.error(error);
  }
};

  if (loading) return <p className="p-4">Loading crops...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">🌱 My Crops</h2>

      <button
        className="bg-green-500 text-white px-4 py-2 rounded mb-4"
        onClick={() => {
          setAdding(true);
          getLocation();
        }}
      >
        Add Crop
      </button>

      {adding && (
        <div className="mb-4 border p-4 rounded bg-gray-50">
          <input
            type="text"
            placeholder="Crop Name"
            value={newCropName}
            onChange={(e) => setNewCropName(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <input
            type="text"
            placeholder="Soil Type"
            value={newSoilType}
            onChange={(e) => setNewSoilType(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <input
            type="text"
            placeholder="Season"
            value={newSeason}
            onChange={(e) => setNewSeason(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <p>GPS: {gpsLocation ? `${gpsLocation.lat}, ${gpsLocation.lng}` : "Fetching..."}</p>

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
            onClick={() => {
              if (!gpsLocation) {
                alert("Waiting for GPS location...");
                return;
              }
              addCrop();
            }}
          >
            Save Crop
          </button>
        </div>
      )}

      {crops.length === 0 ? (
        <p>No crops registered yet.</p>
      ) : (
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Soil</th>
              <th className="border px-4 py-2">Area</th>
              <th className="border px-4 py-2">Location</th>
              <th className="border px-4 py-2">Season</th>
              <th className="border px-4 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {crops.map((crop, i) => (
              <tr key={`${crop._id ?? crop.cropId}-${i}`}>
                <td className="border px-4 py-2">{crop.cropName || "🌱 Unknown"}</td>
                <td className="border px-4 py-2">{crop.soilType || "-"}</td>
                <td className="border px-4 py-2">{crop.area ?? "N/A"}</td>
                <td className="border px-4 py-2">
                  {crop.location ? `${crop.location.lat}, ${crop.location.lng}` : "-"}
                </td>
                <td className="border px-4 py-2">{crop.season || "-"}</td>
                <td className="border px-4 py-2">{crop.source || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
