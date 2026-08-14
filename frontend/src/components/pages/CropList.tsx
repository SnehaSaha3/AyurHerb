import { useEffect, useState } from "react";
import axios from "axios";

interface Crop {
  _id?: string;
  cropId?: string;
  cropName: string;
  soilType?: string;
  area?: number | string;
  quantity?: number;
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
  const [newQuantity, setNewQuantity] = useState("");
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  // --- Edit state ---
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [editCropName, setEditCropName] = useState("");
  const [editSoilType, setEditSoilType] = useState("");
  const [editSeason, setEditSeason] = useState("");
  const [editQuantity, setEditQuantity] = useState("");

  // --- Fetch crops on load ---
  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
  setLoading(true);
  setError(null);

  try {
    const token = localStorage.getItem("farmerToken");

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
  if (newQuantity === "" || isNaN(Number(newQuantity)) || Number(newQuantity) < 0) {
    alert("Please enter a valid quantity (0 or more)");
    return;
  }

  try {
    // FIXED: this was reading "token" while fetchCrops() reads
    // "farmerToken" — two different keys, so this always silently
    // failed with a fake "No token found" even while logged in.
    const token = localStorage.getItem("farmerToken");
    if (!token) throw new Error("No token found.");

    const res = await axios.post(
      "http://localhost:8000/api/crops/add",
      {
        cropName: newCropName,
        soilType: newSoilType,
        season: newSeason,
        quantity: Number(newQuantity),
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
        quantity: Number(newQuantity),
        location: gpsLocation,
        source: "Blockchain",
      },
    ]);

    setNewCropName("");
    setNewSoilType("");
    setNewSeason("");
    setNewQuantity("");
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

  // --- Start editing a crop ---
  const startEditing = (crop: Crop) => {
    setEditingCrop(crop);
    setEditCropName(crop.cropName || "");
    setEditSoilType(crop.soilType || "");
    setEditSeason(crop.season || "");
    setEditQuantity(crop.quantity !== undefined ? String(crop.quantity) : "0");
  };

  // --- Save edited crop ---
  const saveEdit = async () => {
    if (!editingCrop?.cropId) {
      alert("Crop ID not found — can't edit this crop");
      return;
    }
    if (!editCropName.trim()) {
      alert("Crop name is required");
      return;
    }
    if (editQuantity === "" || isNaN(Number(editQuantity)) || Number(editQuantity) < 0) {
      alert("Please enter a valid quantity (0 or more)");
      return;
    }

    try {
      const token = localStorage.getItem("farmerToken");
      if (!token) throw new Error("No token found.");

      const res = await axios.patch(
        `http://localhost:8000/api/crops/${editingCrop.cropId}`,
        {
          cropName: editCropName,
          soilType: editSoilType,
          season: editSeason,
          quantity: Number(editQuantity),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = res.data.crop;

      setCrops((prev) =>
        prev.map((c) =>
          c.cropId === editingCrop.cropId
            ? {
                ...c,
                cropName: updated.cropName,
                soilType: updated.soilType,
                season: updated.season,
                quantity: updated.quantity,
              }
            : c
        )
      );

      setEditingCrop(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Failed to update crop");
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
          <input
            type="number"
            min="0"
            placeholder="Quantity (kg)"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
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

      {editingCrop && (
        <div className="mb-6 border p-4 rounded bg-blue-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Edit Crop</h3>
            <button
              onClick={() => setEditingCrop(null)}
              className="text-gray-500 hover:text-red-500"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Crop Name"
            value={editCropName}
            onChange={(e) => setEditCropName(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <input
            type="text"
            placeholder="Soil Type"
            value={editSoilType}
            onChange={(e) => setEditSoilType(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <input
            type="text"
            placeholder="Season"
            value={editSeason}
            onChange={(e) => setEditSeason(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <input
            type="number"
            min="0"
            placeholder="Quantity (kg)"
            value={editQuantity}
            onChange={(e) => setEditQuantity(e.target.value)}
            className="border p-2 mb-2 w-full"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={saveEdit}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Save Changes
            </button>
            <button
              onClick={() => setEditingCrop(null)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
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
              <th className="border px-4 py-2">Quantity</th>
              <th className="border px-4 py-2">Location</th>
              <th className="border px-4 py-2">Season</th>
              <th className="border px-4 py-2">Source</th>
              <th className="border px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {crops.map((crop, i) => (
              <tr key={`${crop._id ?? crop.cropId}-${i}`}>
                <td className="border px-4 py-2">{crop.cropName || "🌱 Unknown"}</td>
                <td className="border px-4 py-2">{crop.soilType || "-"}</td>
                <td className="border px-4 py-2">{crop.area ?? "N/A"}</td>
                <td className="border px-4 py-2">{crop.quantity ?? 0} kg</td>
                <td className="border px-4 py-2">
                  {crop.location ? `${crop.location.lat}, ${crop.location.lng}` : "-"}
                </td>
                <td className="border px-4 py-2">{crop.season || "-"}</td>
                <td className="border px-4 py-2">{crop.source || "-"}</td>
                <td className="border px-4 py-2">
                  {crop.cropId ? (
                    <button
                      onClick={() => startEditing(crop)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">No ID</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}