import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import L from "leaflet"
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

/** Custom premium cluster badge: glass circle, count, size scales with count */
function createClusterIcon(cluster: any) {
  const count = cluster.getChildCount()
  const size = count < 5 ? 40 : count < 15 ? 48 : 56

  return L.divIcon({
    html: `<div class="crop-cluster-badge" style="width:${size}px;height:${size}px;">
             <span>${count}</span>
           </div>`,
    className: "crop-cluster-wrapper",
    iconSize: L.point(size, size),
  })
}

/** Custom premium pin: small lifted glass droplet instead of default Leaflet marker */
const cropPinIcon = L.divIcon({
  html: `<div class="crop-pin"><div class="crop-pin-dot"></div></div>`,
  className: "crop-pin-wrapper",
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30],
})

interface FarmerGroup {
  farmerId: string
  farmerName: string
  location: { lat: number; lng: number }
  crops: Crop[]
}

/** Groups crops by farmer so each farmer shows as one pin, not one pin per crop */
function groupCropsByFarmer(crops: Crop[]): FarmerGroup[] {
  const groups = new Map<string, FarmerGroup>()

  crops.forEach((crop) => {
    if (!crop.location) return
    const key = crop.farmerId || `unknown-${crop.location.lat}-${crop.location.lng}`

    if (!groups.has(key)) {
      groups.set(key, {
        farmerId: crop.farmerId || key,
        farmerName: crop.farmerName || "Unknown",
        location: crop.location,
        crops: [],
      })
    }
    groups.get(key)!.crops.push(crop)
  })

  return Array.from(groups.values())
}

/** Renders clustered markers; hovering a pin previews the farmer card */
function MarkersLayer({
  crops,
  onViewFarmer,
}: {
  crops: Crop[]
  onViewFarmer: (id: string, name: string) => void
}) {
  const farmerGroups = groupCropsByFarmer(crops)
  const closeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={createClusterIcon}
      maxClusterRadius={45}
      zoomToBoundsOnClick={false}
      spiderfyOnMaxZoom={true}
      spiderfyDistanceMultiplier={1.8}
      showCoverageOnHover={false}
      animate={true}
    >
      {farmerGroups.map((group) => {
        const { lat, lng } = group.location

        return (
          <Marker
            key={group.farmerId}
            position={[lat, lng]}
            icon={cropPinIcon}
            eventHandlers={{
              mouseover: (e) => {
                const marker = e.target
                if (closeTimers.current[group.farmerId]) {
                  clearTimeout(closeTimers.current[group.farmerId])
                  delete closeTimers.current[group.farmerId]
                }
                marker.openPopup()
              },
              mouseout: (e) => {
                const marker = e.target
                closeTimers.current[group.farmerId] = setTimeout(() => {
                  marker.closePopup()
                }, 200)
              },
            }}
          >
            <Popup autoPan={false} closeButton={true} minWidth={240} maxWidth={380}>
              <div
                className="w-full min-w-[220px] max-w-[360px] p-4 bg-white rounded-xl shadow-lg border space-y-2"
                onMouseEnter={() => {
                  if (closeTimers.current[group.farmerId]) {
                    clearTimeout(closeTimers.current[group.farmerId])
                    delete closeTimers.current[group.farmerId]
                  }
                }}
              >
                <h3 className="text-lg font-bold break-words">
                  👨‍🌾 {group.farmerName}
                </h3>

                <p className="text-xs text-gray-500 break-words">
                  📍 {lat}, {lng}
                </p>

                <p className="text-xs font-medium text-gray-400">
                  {group.crops.length} crop{group.crops.length !== 1 ? "s" : ""} listed
                </p>

                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {group.crops.map((crop, idx) => (
                    <div
                      key={`${crop.cropId ?? idx}-${crop.source ?? ""}`}
                      className="border rounded-lg p-2 bg-gray-50"
                    >
                      <p className="font-semibold break-words">🌾 {crop.cropName}</p>
                      <p className="text-sm break-words">
                        🌞 {crop.season || "-"} &nbsp; 🪴 {crop.soilType || "-"}
                      </p>
                      {crop.source && (
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">
                          {crop.source}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onViewFarmer(group.farmerId, group.farmerName)}
                  className="w-full mt-1 px-2 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  View Farmer
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default function CropMap() {
  const navigate = useNavigate()
  const [crops, setCrops] = useState<Crop[]>([])
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

            if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
              lat = lat / 1e6
              lng = lng / 1e6
            }

            if (!lat || !lng) continue

            parsedCrops.push({
              ...crop,
              location: { lat, lng },
            })
          }

          setCrops(parsedCrops)

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
      <style>{`
        .crop-cluster-badge {
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(30,50,44,0.9), rgba(6,14,11,0.95));
          border: 1px solid rgba(93,202,165,0.55);
          box-shadow:
            0 8px 18px rgba(0,0,0,0.45),
            0 0 14px rgba(29,158,117,0.35),
            inset 0 1px 2px rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
          cursor: pointer;
        }
        .crop-cluster-badge span {
          color: #a9ecd2;
          font-size: 15px;
          font-weight: 600;
          text-shadow: 0 0 6px rgba(93,202,165,0.5);
        }
        .crop-cluster-wrapper:hover .crop-cluster-badge {
          transform: translateY(-4px) scale(1.08);
          box-shadow:
            0 14px 26px rgba(0,0,0,0.5),
            0 0 22px rgba(29,158,117,0.55),
            inset 0 1px 2px rgba(255,255,255,0.2);
        }
        .crop-cluster-wrapper:active .crop-cluster-badge {
          transform: translateY(-2px) scale(0.96);
        }

        .crop-pin-wrapper { transition: transform 0.2s ease; }
        .crop-pin {
          width: 26px;
          height: 34px;
          position: relative;
          filter: drop-shadow(0 6px 8px rgba(0,0,0,0.45));
        }
        .crop-pin::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 26px;
          height: 26px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: radial-gradient(circle at 35% 30%, rgba(40,64,56,0.95), rgba(8,20,16,0.98));
          border: 1px solid rgba(93,202,165,0.65);
        }
        .crop-pin-dot {
          position: absolute;
          top: 7px;
          left: 7px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #5dcaa5;
          box-shadow: 0 0 8px rgba(93,202,165,0.9);
        }
        .crop-pin-wrapper:hover { transform: translateY(-3px); }

        .leaflet-cluster-spider-leg {
          stroke: rgba(93,202,165,0.55) !important;
          stroke-width: 1.5 !important;
        }
      `}</style>

      <MapContainer center={mapCenter} zoom={6} className="w-full h-full">
        <MapUpdater center={mapCenter} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkersLayer
          crops={crops}
          onViewFarmer={(id) => navigate(`/company-dashboard/messages?farmerId=${id}`)}
        />
      </MapContainer>

      {crops.length === 0 && (
        <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded shadow z-10">
          Loading crops...
        </div>
      )}
    </div>
  )
}