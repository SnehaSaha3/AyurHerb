import { Map, Marker, ZoomControl } from "pigeon-maps";
import { useEffect, useState } from "react";

function MapComponent() {
  const [coords, setCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          setCoords([20.5937, 78.9629]); // fallback
        }
      );
    } else {
      setCoords([20.5937, 78.9629]);
    }
  }, []);

  // 🌿 Loading Skeleton
  if (!coords) {
    return (
      <div className="h-[320px] rounded-2xl bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-green-700 text-sm">
          Fetching live location...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[320px] relative rounded-2xl overflow-hidden">

      {/* 🌿 Soft overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none z-10"></div>

      <Map
  height={320}
  defaultCenter={coords}
  defaultZoom={6}
>
  <ZoomControl />
  <Marker width={40} anchor={coords} />
     </Map>
      

      {/* 📍 Label */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 text-xs rounded-full shadow-md border border-white/50 z-20">
        📍 Your Live Location
      </div>

      {/* 🌿 Top tag */}
      <div className="absolute top-4 left-4 text-xs text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur z-20">
        Live Tracking
      </div>
    </div>
  );
}

export default MapComponent;