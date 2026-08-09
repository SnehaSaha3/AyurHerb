import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import axios from "axios"
import { Search, X } from "lucide-react"

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

interface FarmerGroup {
  farmerId: string
  farmerName: string
  location: { lat: number; lng: number }
  crops: Crop[]
}

/* ---------------- CROP ICON PLACEHOLDER ----------------
   No real crop photos in the data model yet. This maps common
   crop names to an emoji so pins/cards look like photo-pins
   instead of generic markers. Replace with crop.imageUrl once
   image upload exists on the Crop model. */
const CROP_ICONS: Record<string, string> = {
  ashwagandha: "🌿",
  tulsi: "🍃",
  "aloe vera": "🪴",
  neem: "🌳",
  turmeric: "🟡",
  ginger: "🫚",
}

function getCropIcon(cropName: string): string {
  const key = cropName.trim().toLowerCase()
  return CROP_ICONS[key] || "🌱"
}

/* ---------------- MAP CENTER UPDATER ---------------- */
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center[0] && center[1]) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])
  return null
}

/* ---------------- CLUSTER ICON ---------------- */
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

/* ---------------- PHOTO-STYLE PIN (Google Maps "place photo" look) ----------------
   A circular icon sitting on a pin tail, matching how Google Maps shows
   pinned places with a photo — circle + pointed tail underneath. */
function createFarmerPinIcon(emoji: string) {
  return L.divIcon({
    html: `
      <div class="farmer-pin">
        <div class="farmer-pin-photo">${emoji}</div>
        <div class="farmer-pin-tail"></div>
      </div>
    `,
    className: "farmer-pin-wrapper",
    iconSize: [44, 54],
    iconAnchor: [22, 54],
    popupAnchor: [0, -50],
  })
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

/* ---------------- MARKERS LAYER ---------------- */
function MarkersLayer({
  crops,
  activeCropQuery,
  onViewFarmer,
}: {
  crops: Crop[]
  activeCropQuery: string
  onViewFarmer: (id: string, name: string) => void
}) {
  const farmerGroups = groupCropsByFarmer(crops)
  const closeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
        const query = activeCropQuery.trim().toLowerCase()

        // matched crop surfaces first (same pattern as chat search),
        // rest of the farmer's crops collapse behind "+N"
        const matchedCrop =
          (query && group.crops.find((c) => c.cropName.toLowerCase().includes(query))) ||
          group.crops[0]
        const otherCrops = group.crops.filter((c) => c !== matchedCrop)
        const isExpanded = expandedId === group.farmerId
        const pinEmoji = getCropIcon(matchedCrop?.cropName || "")

        return (
          <Marker
            key={group.farmerId}
            position={[lat, lng]}
            icon={createFarmerPinIcon(pinEmoji)}
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
                className="w-full min-w-[220px] max-w-[360px] p-4 bg-white rounded-xl shadow-lg border space-y-3"
                onMouseEnter={() => {
                  if (closeTimers.current[group.farmerId]) {
                    clearTimeout(closeTimers.current[group.farmerId])
                    delete closeTimers.current[group.farmerId]
                  }
                }}
              >
                {/* Header: photo-style crop icon + farmer name, Google-Maps card style */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-50 border flex items-center justify-center text-2xl shrink-0">
                    {pinEmoji}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-800 truncate">
                      👨‍🌾 {group.farmerName}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {matchedCrop?.cropName}
                      {otherCrops.length > 0 && (
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : group.farmerId)
                          }
                          className="ml-1 text-green-600 font-medium hover:underline"
                        >
                          +{otherCrops.length}
                        </button>
                      )}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400">📍 {lat.toFixed(4)}, {lng.toFixed(4)}</p>

                {/* Matched/primary crop always visible */}
                <div className="border rounded-lg p-2 bg-gray-50">
                  <p className="font-semibold text-sm flex items-center gap-1">
                    {getCropIcon(matchedCrop?.cropName || "")} {matchedCrop?.cropName}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    🌞 {matchedCrop?.season || "-"} &nbsp; 🪴 {matchedCrop?.soilType || "-"}
                  </p>
                </div>

                {/* Expands to show the rest, same interaction as chat's +N */}
                {isExpanded && otherCrops.length > 0 && (
                  <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                    {otherCrops.map((crop, idx) => (
                      <div
                        key={`${crop.cropId ?? idx}-${crop.source ?? ""}`}
                        className="border rounded-lg p-2 bg-gray-50"
                      >
                        <p className="font-semibold text-sm flex items-center gap-1">
                          {getCropIcon(crop.cropName)} {crop.cropName}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          🌞 {crop.season || "-"} &nbsp; 🪴 {crop.soilType || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onViewFarmer(group.farmerId, group.farmerName)}
                  className="w-full mt-1 px-2 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
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
  const [search, setSearch] = useState("")

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

  // Unique crop names for the filter suggestions
  const cropNameOptions = useMemo(() => {
    const names = new Set(crops.map((c) => c.cropName).filter(Boolean))
    return Array.from(names).sort()
  }, [crops])

  // Filtered set of crops the map actually renders pins for.
  // Empty search shows everything (with wallet-gating already
  // enforced server-side by /api/crops).
  const visibleCrops = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return crops
    return crops.filter((c) => c.cropName.toLowerCase().includes(q))
  }, [search, crops])

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

        /* Google-Maps-style "photo pin": circular photo/icon sitting
           above a pointed tail, instead of a plain teardrop marker. */
        .farmer-pin-wrapper { transition: transform 0.2s ease; }
        .farmer-pin {
          width: 44px;
          height: 54px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          filter: drop-shadow(0 6px 8px rgba(0,0,0,0.35));
        }
        .farmer-pin-photo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        }
        .farmer-pin-tail {
          width: 0;
          height: 0;
          margin-top: -2px;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 12px solid #16a34a;
        }
        .farmer-pin-wrapper:hover { transform: translateY(-3px); }

        .leaflet-cluster-spider-leg {
          stroke: rgba(93,202,165,0.55) !important;
          stroke-width: 1.5 !important;
        }
      `}</style>

      {/* ---------------- CROP FILTER BAR ---------------- */}
      <div className="absolute top-4 left-4 right-4 z-[500] flex justify-center pointer-events-none">
        <div className="w-full max-w-sm pointer-events-auto">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-2 rounded-xl border shadow-md">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter map by crop (e.g. Tulsi)..."
              className="text-sm outline-none w-full bg-transparent"
              list="crop-name-options"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>
          <datalist id="crop-name-options">
            {cropNameOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          {search && (
            <p className="mt-2 text-xs text-white bg-black/50 backdrop-blur px-3 py-1 rounded-lg inline-block">
              Showing farmers growing "{search}"
            </p>
          )}
        </div>
      </div>

      <MapContainer center={mapCenter} zoom={6} className="w-full h-full">
        <MapUpdater center={mapCenter} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkersLayer
          crops={visibleCrops}
          activeCropQuery={search}
          onViewFarmer={(id) => navigate(`/company-dashboard/messages?farmerId=${id}`)}
        />
      </MapContainer>

      {crops.length === 0 && (
        <div className="absolute top-20 left-4 bg-white px-3 py-1 rounded shadow z-10">
          Loading crops...
        </div>
      )}

      {crops.length > 0 && visibleCrops.length === 0 && (
        <div className="absolute top-20 left-4 bg-white px-3 py-1 rounded shadow z-10 text-sm text-gray-600">
          No farmers found growing "{search}"
        </div>
      )}
    </div>
  )
}