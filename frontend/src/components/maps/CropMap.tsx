import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet"
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

function getCropAccent(cropName: string): string {
  return getCropIcon(cropName)
}

function getCropKey(crop: Crop): string {
  if (crop.cropId) return `crop-${crop.cropId}`
  if (crop._id) return `mongo-${crop._id}`

  return [
    crop.cropName.trim().toLowerCase(),
    crop.farmerId || "",
    crop.location?.lat ?? "",
    crop.location?.lng ?? "",
    crop.season || "",
  ].join("|")
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    if (center[0] && center[1]) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])

  return null
}

function createClusterIcon(cluster: any) {
  const count = cluster.getChildCount()
  const size = count < 5 ? 40 : count < 15 ? 48 : 56

  return L.divIcon({
    html: `<div class="crop-cluster-badge" style="width:${size}px;height:${size}px;"><span>${count}</span></div>`,
    className: "crop-cluster-wrapper",
    iconSize: L.point(size, size),
  })
}

function createFarmerPinIcon(emoji: string) {
  return L.divIcon({
    html: `
      <div class="farmer-pin">
        <div class="farmer-pin-photo">${emoji}</div>
        <div class="farmer-pin-tail"></div>
      </div>
    `,
    className: "farmer-pin-wrapper",
    iconSize: [46, 56],
    iconAnchor: [23, 56],
    popupAnchor: [0, -52],
  })
}

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
      zoomToBoundsOnClick={true}
      disableClusteringAtZoom={16}
      spiderfyOnMaxZoom={true}
      spiderfyDistanceMultiplier={1.8}
      showCoverageOnHover={false}
      animate={true}
    >
      {farmerGroups.map((group) => {
        const { lat, lng } = group.location
        const query = activeCropQuery.trim().toLowerCase()

        const matchedCrop =
          (query && group.crops.find((crop) => crop.cropName.toLowerCase().includes(query))) ||
          group.crops[0]

        const otherCrops = group.crops.filter((crop) => crop !== matchedCrop)
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
            <Popup
              autoPan={true}
              closeButton={true}
              minWidth={270}
              maxWidth={360}
              className="ayurherb-map-popup"
            >
              <div
                className="w-[280px] max-w-[calc(100vw-70px)] p-4"
                onMouseEnter={() => {
                  if (closeTimers.current[group.farmerId]) {
                    clearTimeout(closeTimers.current[group.farmerId])
                    delete closeTimers.current[group.farmerId]
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d8eadb] bg-[#edf8ef] text-2xl">
                    {pinEmoji}
                  </div>

                  <div className="min-w-0 pr-6">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8a9c8e]">
                      FARMER
                    </p>
                    <h3 className="mt-0.5 truncate text-[15px] font-bold text-[#173b27]">
                      {group.farmerName}
                    </h3>
                    <p className="mt-0.5 truncate text-xs font-medium text-[#6b7e6e]">
                      {matchedCrop?.cropName}
                      {otherCrops.length > 0 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : group.farmerId)}
                          className="ml-1 font-semibold text-[#168443] hover:underline"
                        >
                          +{otherCrops.length}
                        </button>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#e3eee4] bg-[#f5faf5] px-3 py-2">
                  <span className="text-xs">📍</span>
                  <span className="text-[10px] font-medium text-[#708271]">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                  </span>
                </div>

                {matchedCrop && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[#dcebdd] bg-white/70">
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf8ef] text-2xl">
                        {getCropAccent(matchedCrop.cropName)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#284b34]">
                          {matchedCrop.cropName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span className="text-[10px] font-medium text-[#708271]">
                            ☀ {matchedCrop.season || "Season N/A"}
                          </span>
                          <span className="text-[10px] font-medium text-[#708271]">
                            ◉ {matchedCrop.soilType || "Soil N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && otherCrops.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {otherCrops.map((crop) => (
                      <div
                        key={getCropKey(crop)}
                        className="flex items-center gap-3 rounded-2xl border border-[#e3eee4] bg-[#f8fbf8] p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf7ee] text-lg">
                          {getCropAccent(crop.cropName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-[#31533b]">
                            {crop.cropName}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-[#7b8b7d]">
                            {crop.season || "Season N/A"} • {crop.soilType || "Soil N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onViewFarmer(group.farmerId, group.farmerName)}
                  className="mt-3 w-full rounded-xl bg-[#168443] px-3 py-2.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(22,132,67,0.18)] transition hover:bg-[#11723a]"
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

        if (!Array.isArray(res.data.crops)) {
          setCrops([])
          return
        }

        const parsedCrops: Crop[] = []

        for (const crop of res.data.crops as Crop[]) {
          if (!crop || !crop.location) continue

          let lat = Number(crop.location.lat)
          let lng = Number(crop.location.lng)

          // some stored coordinates arrive multiplied by 1e6
          if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            lat = lat / 1e6
            lng = lng / 1e6
          }

          if (!lat || !lng) continue

          parsedCrops.push({ ...crop, location: { lat, lng } })
        }

        setCrops(parsedCrops)

        if (parsedCrops.length > 0) {
          setMapCenter([parsedCrops[0].location!.lat, parsedCrops[0].location!.lng])
        }
      } catch (err) {
        console.error("Error fetching crops:", err)
        setCrops([])
      }
    }

    fetchCrops()
  }, [])

  const cropNameOptions = useMemo(() => {
    const names = new Set(crops.map((crop) => crop.cropName).filter(Boolean))
    return Array.from(names).sort()
  }, [crops])

  const visibleCrops = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return crops
    return crops.filter((crop) => crop.cropName.toLowerCase().includes(q))
  }, [search, crops])

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-[24px] border border-white/70 shadow-[0_18px_50px_rgba(54,91,63,0.10)] md:h-[80vh]">
      <style>{`
        .crop-cluster-badge {
          border-radius: 50%;
          background: rgba(19, 55, 37, 0.92);
          border: 2px solid rgba(255, 255, 255, 0.88);
          box-shadow: 0 8px 20px rgba(22, 57, 38, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .crop-cluster-badge span {
          color: #e7f7e9;
          font-size: 14px;
          font-weight: 700;
        }

        .crop-cluster-wrapper:hover .crop-cluster-badge {
          transform: scale(1.06);
        }

        .farmer-pin-wrapper {
          transition: transform 0.18s ease;
        }

        .farmer-pin {
          width: 46px;
          height: 56px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          filter: drop-shadow(0 7px 8px rgba(24, 55, 37, 0.25));
        }

        .farmer-pin-photo {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(235, 247, 236, 0.94));
          border: 3px solid #168443;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 3px 10px rgba(25, 70, 42, 0.2);
        }

        .farmer-pin-tail {
          width: 0;
          height: 0;
          margin-top: -2px;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 12px solid #168443;
        }

        .farmer-pin-wrapper:hover {
          transform: translateY(-2px);
        }

        .ayurherb-map-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 22px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 20px 50px rgba(30, 70, 45, 0.18);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .ayurherb-map-popup .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }

        .ayurherb-map-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.88);
        }

        .ayurherb-map-popup .leaflet-popup-close-button {
          top: 10px !important;
          right: 10px !important;
          width: 30px !important;
          height: 30px !important;
          border-radius: 50%;
          color: #607363 !important;
          background: rgba(255, 255, 255, 0.72);
          display: flex !important;
          align-items: center;
          justify-content: center;
          font-size: 18px !important;
          z-index: 5;
        }

        .ayurherb-map-popup .leaflet-popup-close-button:hover {
          background: white;
          color: #173b27 !important;
        }

        .ayurherb-map-search {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.88);
          box-shadow: 0 12px 30px rgba(35, 76, 49, 0.14);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .ayurherb-map-message {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 25px rgba(35, 76, 49, 0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        @media (max-width: 640px) {
          .ayurherb-map-search {
            border-radius: 16px;
          }

          .ayurherb-map-popup .leaflet-popup-content-wrapper {
            border-radius: 18px;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute left-4 right-4 top-4 z-[500] flex justify-center">
        <div className="pointer-events-auto w-full max-w-md">
          <div className="ayurherb-map-search flex items-center gap-2 rounded-2xl px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eaf6ec]">
              <Search size={16} className="text-[#168443]" />
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by crop..."
              className="min-w-0 w-full bg-transparent text-sm font-medium text-[#284b34] outline-none placeholder:text-[#8b9a8e]"
              list="crop-name-options"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#849285] hover:bg-white/70 hover:text-[#31533b]"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <datalist id="crop-name-options">
            {cropNameOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          {search && (
            <div className="mt-2 inline-flex rounded-xl border border-white/70 bg-white/75 px-3 py-1.5 text-[10px] font-semibold text-[#42604b] shadow-sm backdrop-blur-xl">
              Showing farmers growing "{search}"
            </div>
          )}
        </div>
      </div>

      <MapContainer center={mapCenter} zoom={6} className="h-full w-full">
        <MapUpdater center={mapCenter} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkersLayer
          crops={visibleCrops}
          activeCropQuery={search}
          onViewFarmer={(id) => navigate(`/company-dashboard/messages?farmerId=${id}`)}
        />
      </MapContainer>

      {crops.length === 0 && (
        <div className="ayurherb-map-message absolute left-4 top-20 z-10 rounded-xl px-4 py-2.5 text-xs font-medium text-[#526958]">
          Loading crops...
        </div>
      )}

      {crops.length > 0 && visibleCrops.length === 0 && (
        <div className="ayurherb-map-message absolute left-4 top-20 z-10 rounded-xl px-4 py-2.5 text-xs font-medium text-[#526958]">
          No farmers found growing "{search}"
        </div>
      )}
    </div>
  )
}