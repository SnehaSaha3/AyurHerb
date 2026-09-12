import { useEffect, useState } from "react";
import axios from "axios";

interface Crop {
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

  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);

  /*
   * The backend now merges the blockchain and MongoDB records for a
   * crop into a single object keyed by cropId before it ever reaches
   * this component, so cropId alone is a safe React key. The only
   * crops without one are legitimately distinct records (e.g. the
   * starter crop created at registration), so an index fallback is
   * fine there — it isn't standing in for a real identity check.
   */
  const getCropKey = (crop: Crop, index: number): string =>
    crop.cropId ? `crop-${crop.cropId}` : `crop-no-id-${index}`;

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
      alert("Geolocation not supported in your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),

      (err) =>
        alert(
          "Failed to fetch location: " +
            err.message
        )
    );
  };

  const addCrop = async () => {
    if (!newCropName || !gpsLocation) {
      alert(
        "Please enter crop name and allow GPS location"
      );
      return;
    }

    if (
      newQuantity === "" ||
      isNaN(Number(newQuantity)) ||
      Number(newQuantity) < 0
    ) {
      alert(
        "Please enter a valid quantity (0 or more)"
      );
      return;
    }

    try {
      const token =
        localStorage.getItem("farmerToken");

      if (!token) {
        throw new Error("No token found.");
      }

      await axios.post(
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

      await fetchCrops();

      setNewCropName("");
      setNewSoilType("");
      setNewSeason("");
      setNewQuantity("");
      setGpsLocation(null);
      setAdding(false);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(
          error.response?.data?.error ||
            "Failed to add crop"
        );
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

    setEditCropName(
      crop.cropName || ""
    );

    setEditSoilType(
      crop.soilType || ""
    );

    setEditSeason(
      crop.season || ""
    );

    setEditQuantity(
      crop.quantity !== undefined
        ? String(crop.quantity)
        : "0"
    );
  };

  const saveEdit = async () => {
    if (!editingCrop?.cropId) {
      alert(
        "Crop ID not found — can't edit this crop"
      );
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
      alert(
        "Please enter a valid quantity (0 or more)"
      );
      return;
    }

    try {
      const token =
        localStorage.getItem("farmerToken");

      if (!token) {
        throw new Error("No token found.");
      }

      await axios.patch(
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

      await fetchCrops();

      setEditingCrop(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(
          error.response?.data?.error ||
            "Failed to update crop"
        );
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
      <p className="p-4 text-[#58705e]">
        Loading crops...
      </p>
    );
  }

  if (error) {
    return (
      <p className="p-4 text-red-500">
        {error}
      </p>
    );
  }

  return (
    <div className="p-4 sm:p-6">

      <div className="mb-5 inline-block rounded-2xl border border-white/60 bg-white/65 px-5 py-4 shadow-[0_8px_30px_rgba(30,70,45,0.08)] backdrop-blur-md">

        <p className="mb-1 text-[10px] font-bold tracking-[0.24em] text-[#1f7143]">
          FARM
        </p>

        <h1 className="text-[26px] font-bold leading-tight text-[#123d28]">
          My Crops
        </h1>

        <p className="mt-1 text-sm font-medium text-[#496553]">
          Manage your registered crops and farm information.
        </p>

        <button
          className="mt-4 w-fit rounded-xl bg-[#0c9b5a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(12,155,90,0.18)] hover:bg-[#08884f]"
          onClick={() => {
            setAdding(true);
            getLocation();
          }}
        >
          + Add Crop
        </button>

      </div>

      {adding && (
        <div className="mb-5 rounded-2xl border border-white/70 bg-white/50 p-4 shadow-sm backdrop-blur-xl">

          <div className="grid gap-3 sm:grid-cols-2">

            <input
              type="text"
              placeholder="Crop Name"
              value={newCropName}
              onChange={(e) =>
                setNewCropName(e.target.value)
              }
              className="rounded-xl border border-white/70 bg-white/65 p-3 text-sm outline-none placeholder:text-[#8b9a8e]"
            />

            <input
              type="text"
              placeholder="Soil Type"
              value={newSoilType}
              onChange={(e) =>
                setNewSoilType(e.target.value)
              }
              className="rounded-xl border border-white/70 bg-white/65 p-3 text-sm outline-none placeholder:text-[#8b9a8e]"
            />

            <input
              type="text"
              placeholder="Season"
              value={newSeason}
              onChange={(e) =>
                setNewSeason(e.target.value)
              }
              className="rounded-xl border border-white/70 bg-white/65 p-3 text-sm outline-none placeholder:text-[#8b9a8e]"
            />

            <input
              type="number"
              min="0"
              placeholder="Quantity (kg)"
              value={newQuantity}
              onChange={(e) =>
                setNewQuantity(e.target.value)
              }
              className="rounded-xl border border-white/70 bg-white/65 p-3 text-sm outline-none placeholder:text-[#8b9a8e]"
            />

          </div>

          <p className="mt-3 text-xs text-[#6c7f70]">
            GPS:{" "}
            {gpsLocation
              ? `${gpsLocation.lat}, ${gpsLocation.lng}`
              : "Fetching..."}
          </p>

          <div className="mt-3 flex gap-2">

            <button
              className="rounded-xl bg-[#0c9b5a] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                if (!gpsLocation) {
                  alert(
                    "Waiting for GPS location..."
                  );
                  return;
                }

                addCrop();
              }}
            >
              Save Crop
            </button>

            <button
              onClick={() =>
                setAdding(false)
              }
              className="rounded-xl bg-white/70 px-4 py-2 text-sm text-[#607363]"
            >
              Cancel
            </button>

          </div>

        </div>
      )}

      {editingCrop && (
        <div className="mb-5 rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-xl">

          <div className="mb-3 flex items-center justify-between">

            <h3 className="text-lg font-semibold text-[#173b27]">
              Edit Crop
            </h3>

            <button
              onClick={() =>
                setEditingCrop(null)
              }
              className="rounded-lg px-2 py-1 text-[#708271] hover:bg-white/70 hover:text-red-500"
            >
              ✕
            </button>

          </div>

          <div className="grid gap-3 sm:grid-cols-2">

            <input
              type="text"
              placeholder="Crop Name"
              value={editCropName}
              onChange={(e) =>
                setEditCropName(e.target.value)
              }
              className="rounded-xl border border-white/70 bg-white/65 p-3 text-sm"
            />

            <input
              type="text"
              placeholder="Soil Type"
              value={editSoilType}
              onChange={(e) =>
                setEditSoilType(e.target.value)
              }
              className="rounded-xl border border-white/70 bg-white/65 p-3 text-sm"
            />

            <input
              type="text"
              placeholder="Season"
              value={editSeason}
              onChange={(e) =>
                setEditSeason(e.target.value)
              }
              className="rounded-xl border border-white/70 bg-white/65 p-3 text-sm"
            />

            <input
              type="number"
              min="0"
              placeholder="Quantity (kg)"
              value={editQuantity}
              onChange={(e) =>
                setEditQuantity(e.target.value)
              }
              className="rounded-xl border border-white/70 bg-white/65 p-3 text-sm"
            />

          </div>

          <div className="mt-3 flex gap-2">

            <button
              onClick={saveEdit}
              className="rounded-xl bg-[#0c9b5a] px-4 py-2 text-sm font-semibold text-white"
            >
              Save Changes
            </button>

            <button
              onClick={() =>
                setEditingCrop(null)
              }
              className="rounded-xl bg-white/70 px-4 py-2 text-sm text-[#607363]"
            >
              Cancel
            </button>

          </div>

        </div>
      )}

      <div className="overflow-hidden rounded-[22px] border border-white/70 bg-white/48 shadow-[0_15px_45px_rgba(54,91,63,0.08)] backdrop-blur-xl">

        <div className="border-b border-white/60 px-5 py-4">

          <h3 className="text-base font-bold text-[#173b27]">
            Registered Crops
          </h3>

          <p className="mt-0.5 text-xs text-[#718473]">
            {crops.length}{" "}
            {crops.length === 1
              ? "crop"
              : "crops"}{" "}
            registered
          </p>

        </div>

        {crops.length === 0 ? (

          <p className="p-5 text-sm text-[#718473]">
            No crops registered yet.
          </p>

        ) : (

          <>
            <div className="hidden overflow-x-auto lg:block">

              <table className="w-full min-w-[1050px] border-collapse">

                <thead>
                  <tr className="border-b border-white/60 text-left">

                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-[#617696]">
                      Name
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-[#617696]">
                      Soil
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-[#617696]">
                      Area
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-[#617696]">
                      Quantity
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-[#617696]">
                      Location
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-[#617696]">
                      Season
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-[#617696]">
                      Source
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 text-right text-xs font-semibold text-[#617696]">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {crops.map((crop, index) => (

                    <tr
                      key={getCropKey(crop, index)}
                      className="border-b border-white/50 last:border-0"
                    >

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-[#314d39]">
                        {crop.cropName ||
                          "🌱 Unknown"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[#607363]">
                        {crop.soilType || "-"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[#607363]">
                        {crop.area ?? "N/A"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-[#314d39]">
                        {crop.quantity ?? 0} kg
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[#607363]">
                        {crop.location
                          ? `${crop.location.lat}, ${crop.location.lng}`
                          : "-"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-[#607363]">
                        {crop.season || "-"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">

                        <span className="rounded-full bg-[#e4f7ec] px-3 py-1 text-xs font-semibold text-[#07864b]">
                          {crop.source || "-"}
                        </span>

                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">

                        {crop.cropId ? (
                          <button
                            onClick={() =>
                              startEditing(crop)
                            }
                            className="rounded-xl bg-[#e8f8ef] px-3 py-1.5 text-xs font-semibold text-[#07864b] hover:bg-[#d8f2e3]"
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-xs text-[#9aaa9b]">
                            No ID
                          </span>
                        )}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            <div className="space-y-2 p-3 lg:hidden">

              {crops.map((crop, index) => {

                const cropKey =
                  getCropKey(crop, index);

                const expanded =
                  expandedCrop === cropKey;

                return (
                  <div
                    key={cropKey}
                    className="overflow-hidden rounded-2xl border border-white/70 bg-white/45 backdrop-blur-xl"
                  >

                    <button
                      onClick={() =>
                        setExpandedCrop(
                          expanded
                            ? null
                            : cropKey
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                    >

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-[#284b34]">
                          🌱{" "}
                          {crop.cropName ||
                            "Unknown crop"}
                        </p>

                        <p className="mt-1 text-xs text-[#748677]">
                          {crop.soilType ||
                            "Soil N/A"}
                          {" • "}
                          {crop.season ||
                            "Season N/A"}
                        </p>

                      </div>

                      <div className="flex shrink-0 items-center gap-3">

                        <span className="text-sm font-bold text-[#168443]">
                          {crop.quantity ?? 0} kg
                        </span>

                        <span
                          className={`ml-1 inline-block h-2 w-2 rotate-45 border-b-2 border-r-2 border-[#708271] transition-transform ${
                            expanded
                              ? "translate-y-0.5 rotate-[225deg]"
                              : ""
                          }`}
                          aria-hidden="true"
                        />

                      </div>

                    </button>

                    {expanded && (
                      <div className="border-t border-white/60 px-4 py-4">

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">

                          <CropDetail
                            label="Soil"
                            value={
                              crop.soilType ||
                              "-"
                            }
                          />

                          <CropDetail
                            label="Area"
                            value={
                              crop.area ?? "N/A"
                            }
                          />

                          <CropDetail
                            label="Season"
                            value={
                              crop.season ||
                              "-"
                            }
                          />

                          <CropDetail
                            label="Source"
                            value={
                              crop.source ||
                              "-"
                            }
                          />

                          <div className="col-span-2">

                            <CropDetail
                              label="Location"
                              value={
                                crop.location
                                  ? `${crop.location.lat}, ${crop.location.lng}`
                                  : "-"
                              }
                            />

                          </div>

                        </div>

                        <div className="mt-4 flex justify-end">

                          {crop.cropId ? (
                            <button
                              onClick={() =>
                                startEditing(crop)
                              }
                              className="rounded-xl bg-[#e5f7ec] px-4 py-2 text-xs font-semibold text-[#07864b]"
                            >
                              Edit Crop
                            </button>
                          ) : (
                            <span className="text-xs text-[#9aaa9b]">
                              No ID available
                            </span>
                          )}

                        </div>

                      </div>
                    )}

                  </div>
                );
              })}

            </div>

          </>
        )}

      </div>

    </div>
  );
}

function CropDetail({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#91a293]">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-medium text-[#526958]">
        {value}
      </p>
    </div>
  );
}