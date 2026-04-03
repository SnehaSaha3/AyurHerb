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

  if (!coords) {
    return (
      <div className="h-[320px] flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-gray-500">
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[320px] relative">
      <Map
        height={320}
        center={coords}
        zoom={6}
        defaultZoom={5}
      >
        <ZoomControl />

        {/* Marker */}
        <Marker width={40} anchor={coords} />

      </Map>

      {/* Overlay label */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1 text-xs rounded-full shadow">
        📍 Your Location
      </div>
    </div>
  );
}

export default MapComponent;