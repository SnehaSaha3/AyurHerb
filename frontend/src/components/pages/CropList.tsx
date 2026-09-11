import { useEffect, useState } from "react";
import axios from "axios";

interface Crop {
  _id?: string;
  cropId?: string;
  cropName: string;
  soilType?: string;
  area?: number | string;
  quantity?: number;
  location?: {
    lat: number;
    lng: number;
  };
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
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [editCropName, setEditCropName] = useState("");
  const [editSoilType, setEditSoilType] = useState("");
  const [editSeason, setEditSeason] = useState("");
  const [editQuantity, setEditQuantity] = useState("");

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

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        alert("Failed to fetch location: " + err.message);
      }
    );
  };

  const addCrop = async () => {
    if (!newCropName || !gpsLocation) {
      alert("Please enter crop name and allow GPS location");
      return;
    }

    if (
      newQuantity === "" ||
      isNaN(Number(newQuantity)) ||
      Number(newQuantity) < 0
    ) {
      alert("Please enter a valid quantity (0 or more)");
      return;
    }

    try {
      const token = localStorage.getItem("farmerToken");

      if (!token) {
        throw new Error("No token found.");
      }

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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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

  const startEditing = (crop: Crop) => {
    setEditingCrop(crop);
    setEditCropName(crop.cropName || "");
    setEditSoilType(crop.soilType || "");
    setEditSeason(crop.season || "");
    setEditQuantity(
      crop.quantity !== undefined ? String(crop.quantity) : "0"
    );
  };

  const saveEdit = async () => {
    if (!editingCrop?.cropId) {
      alert("Crop ID not found — can't edit this crop");
      return;
    }

    if (!editCropName.trim()) {
      alert("Crop name is required");
      return;
    }

    if (
      editQuantity === "" ||
      isNaN(Number(editQuantity)) ||
      Number(editQuantity) < 0
    ) {
      alert("Please enter a valid quantity (0 or more)");
      return;
    }

    try {
      const token = localStorage.getItem("farmerToken");

      if (!token) {
        throw new Error("No token found.");
      }

      const res = await axios.patch(
        `http://localhost:8000/api/crops/${editingCrop.cropId}`,
        {
          cropName: editCropName,
          soilType: editSoilType,
          season: editSeason,
          quantity: Number(editQuantity),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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

  if (loading) {
    return (
      <div className="p-6 text-slate-600">
        Loading crops...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 p-4 sm:p-6">

      {/* PAGE HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-emerald-600">
            FARM
          </p>

          <h1 className="text-2xl font-semibold text-slate-800 sm:text-3xl">
            My Crops
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your registered crops and farm information.
          </p>
        </div>

        <button
          onClick={() => {
            setAdding(true);
            getLocation();
          }}
          className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
        >
          + Add Crop
        </button>
      </div>

      {/* ADD CROP */}
      {adding && (
        <div className="mb-6 rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Add New Crop
            </h2>

            <p className="text-sm text-slate-500">
              Register a crop using your current farm location.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Crop Name"
              value={newCropName}
              onChange={(e) => setNewCropName(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              type="text"
              placeholder="Soil Type"
              value={newSoilType}
              onChange={(e) => setNewSoilType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              type="text"
              placeholder="Season"
              value={newSeason}
              onChange={(e) => setNewSeason(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              type="number"
              min="0"
              placeholder="Quantity (kg)"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span className="font-medium">GPS:</span>{" "}
            {gpsLocation
              ? `${gpsLocation.lat}, ${gpsLocation.lng}`
              : "Fetching your location..."}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (!gpsLocation) {
                  alert("Waiting for GPS location...");
                  return;
                }

                addCrop();
              }}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Save Crop
            </button>

            <button
              onClick={() => {
                setAdding(false);
                setGpsLocation(null);
              }}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* EDIT CROP */}
      {editingCrop && (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Edit Crop
              </h2>

              <p className="text-sm text-slate-500">
                Update your crop information.
              </p>
            </div>

            <button
              onClick={() => setEditingCrop(null)}
              className="rounded-full px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-red-500"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Crop Name"
              value={editCropName}
              onChange={(e) => setEditCropName(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              type="text"
              placeholder="Soil Type"
              value={editSoilType}
              onChange={(e) => setEditSoilType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              type="text"
              placeholder="Season"
              value={editSeason}
              onChange={(e) => setEditSeason(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
            />

            <input
              type="number"
              min="0"
              placeholder="Quantity (kg)"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={saveEdit}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Save Changes
            </button>

            <button
              onClick={() => setEditingCrop(null)}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CROP TABLE */}
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm backdrop-blur-xl">

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-800">
                Registered Crops
              </h2>

              <p className="text-sm text-slate-500">
                {crops.length} crop{crops.length !== 1 ? "s" : ""} registered
              </p>
            </div>
          </div>
        </div>

        {crops.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mb-3 text-4xl">🌱</div>

            <h3 className="font-medium text-slate-700">
              No crops registered yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add your first crop to start tracking your farm.
            </p>
          </div>
        ) : (
          /*
            IMPORTANT:
            This wrapper prevents the table from breaking into the
            individual cards/lines when the dashboard becomes narrow.

            The table keeps its natural width and scrolls horizontally.
          */
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-sm">

              <thead>
                <tr className="border-b border-slate-100 bg-white/60 text-left">

                  <th className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
                    Name
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
                    Soil
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
                    Area
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
                    Quantity
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
                    Location
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
                    Season
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
                    Source
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-right font-medium text-slate-500">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody>
                {crops.map((crop, i) => (
                  <tr
                    key={`${crop._id ?? crop.cropId}-${i}`}
                    className="border-b border-slate-100 last:border-0 hover:bg-white/50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">
                      {crop.cropName || "🌱 Unknown"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {crop.soilType || "-"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {crop.area ?? "N/A"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {crop.quantity ?? 0} kg
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {crop.location
                        ? `${crop.location.lat}, ${crop.location.lng}`
                        : "-"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {crop.season || "-"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        {crop.source || "-"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {crop.cropId ? (
                        <button
                          onClick={() => startEditing(crop)}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Edit
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          No ID
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>
    </div>
  );
}