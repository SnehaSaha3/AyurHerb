import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import axios from "axios"

interface Crop {
  _id?: string
  cropId?: string
  cropName: string
  soilType?: string
  location?: { lat: number; lng: number }
  season?: string
  farmerName?: string
  farmerId?: string
  source?: string
}

/** Component to dynamically update map center */
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center[0] && center[1]) map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export default function CropMap() {
  const [crops, setCrops] = useState<Crop[]>([])
  const [selectedFarmer, setSelectedFarmer] = useState<{ id: string; name: string } | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([26.2, 92.93])
  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/crops")
        if (Array.isArray(res.data.crops)) {
          const parsedCrops: Crop[] = []

          for (const crop of res.data.crops as Crop[]) {
            if (crop && crop.location) {
              parsedCrops.push({
                ...crop,
                location: {
                  lat: Number(crop.location.lat),
                  lng: Number(crop.location.lng),
                },
              })
            }
          }

          setCrops(parsedCrops)

          // Center map on first valid location
          const firstValid = parsedCrops.find(
            (c) => c.location && c.location.lat !== 0 && c.location.lng !== 0
          )
          if (firstValid?.location) {
            setMapCenter([firstValid.location.lat, firstValid.location.lng])
          }
        } else {
          setCrops([])
        }
      } catch (err) {
        console.error("Error fetching crops:", err)
        setCrops([])
      }
    }

    fetchCrops()
  }, [])

  return (
    <div className="w-full h-[600px] md:h-[80vh] relative">
      <MapContainer center={mapCenter} zoom={8} className="w-full h-full">
        <MapUpdater center={mapCenter} />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {crops.map((crop, i) => {
          // Generate a unique key using farmerId + cropId + index
          const key = `${crop.farmerId ?? "unknown"}-${crop.cropId ?? "unknown"}-${i}`;
          return (
            crop.location && (
              <Marker
                key={key}
                position={[crop.location.lat, crop.location.lng]}
              >
                <Popup>
                  <div className="w-72 p-4 bg-white rounded-xl shadow-lg border border-gray-200 space-y-2">
                    <h3 className="text-lg font-bold">🌾 {crop.cropName}</h3>
                    <div>
                      🌞 <span className="font-semibold">Season:</span> {crop.season || "-"}
                    </div>
                    <div>
                      🪴 <span className="font-semibold">Soil:</span> {crop.soilType || "-"}
                    </div>
                    <div className="text-sm text-gray-500">
                      📍 Lat: {crop.location.lat}, Lng: {crop.location.lng}
                    </div>
                    {crop.farmerId && (
                      <div>
                        👨‍🌾 <span className="font-semibold">Farmer:</span> {crop.farmerName}
                        <button
                          onClick={() =>
                            setSelectedFarmer({
                              id: crop.farmerId ?? "",
                              name: crop.farmerName ?? "",
                            })
                          }
                          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                          View Farmer
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          )
        })}
      </MapContainer>

      {crops.length === 0 && (
        <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded shadow z-10">
          Loading crops...
        </div>
      )}

      {selectedFarmer && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-11/12 md:w-96 space-y-4">
            <h2 className="text-xl font-bold mb-2">👨‍🌾 Farmer Details</h2>
            <p>
              <span className="font-semibold">Farmer Name:</span> {selectedFarmer.name}
            </p>
            <p>
              <span className="font-semibold">Farmer ID:</span> {selectedFarmer.id}
            </p>
            <button
              onClick={() => setSelectedFarmer(null)}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
