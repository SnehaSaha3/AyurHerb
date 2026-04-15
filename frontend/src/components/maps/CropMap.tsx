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

/** Map Center Updater */
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center[0] && center[1]) {
      map.setView(center, map.getZoom())
    }
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
        const res = await axios.get("http://localhost:8000/api/crops")

        if (Array.isArray(res.data.crops)) {
          const parsedCrops: Crop[] = []

          for (const crop of res.data.crops as Crop[]) {
            if (!crop || !crop.location) continue

            let lat = Number(crop.location.lat)
            let lng = Number(crop.location.lng)

            // 🧠 FIX: Handle blockchain scaled values
            if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
              lat = lat / 1e6
              lng = lng / 1e6
            }

            // 🧠 FIX: Only skip truly invalid values
            if (!lat || !lng) continue

            parsedCrops.push({
              ...crop,
              location: { lat, lng },
            })
          }

          setCrops(parsedCrops)

          // Center map on first valid crop
          if (parsedCrops.length > 0) {
            setMapCenter([
              parsedCrops[0].location!.lat,
              parsedCrops[0].location!.lng,
            ])
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
      <MapContainer center={mapCenter} zoom={6} className="w-full h-full">
        <MapUpdater center={mapCenter} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {crops.map((crop, i) => {
          const key = `${crop.farmerId ?? "unknown"}-${crop.cropId ?? "unknown"}-${i}`

          return (
            <Marker
              key={key}
              position={[crop.location!.lat, crop.location!.lng]}
            >
              <Popup>
                <div className="w-72 p-4 bg-white rounded-xl shadow-lg border space-y-2">
                  <h3 className="text-lg font-bold">🌾 {crop.cropName}</h3>

                  <p>🌞 <b>Season:</b> {crop.season || "-"}</p>
                  <p>🪴 <b>Soil:</b> {crop.soilType || "-"}</p>

                  <p className="text-xs text-gray-500">
                    📍 {crop.location!.lat}, {crop.location!.lng}
                  </p>

                  {crop.farmerId && (
                    <div>
                      👨‍🌾 <b>{crop.farmerName || "Unknown"}</b>

                      <button
                        onClick={() =>
                          setSelectedFarmer({
                            id: crop.farmerId!,
                            name: crop.farmerName || "Unknown",
                          })
                        }
                        className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        View
                      </button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Loading */}
      {crops.length === 0 && (
        <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded shadow z-10">
          Loading crops...
        </div>
      )}

      {/* Farmer Modal */}
      {selectedFarmer && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 space-y-4">
            <h2 className="text-xl font-bold">👨‍🌾 Farmer Details</h2>

            <p><b>Name:</b> {selectedFarmer.name}</p>
            <p><b>ID:</b> {selectedFarmer.id}</p>

            <button
              onClick={() => setSelectedFarmer(null)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}