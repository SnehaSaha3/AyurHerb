import { Map, Marker, ZoomControl } from 'pigeon-maps';
import { useEffect, useState } from 'react';

function MapComponent() {
  const [coords, setCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          alert('Location access denied. Showing default view.');
          setCoords([20.5937, 78.9629]); // India center
        }
      );
    } else {
      alert('Geolocation not supported.');
      setCoords([20.5937, 78.9629]);
    }
  }, []);

  if (!coords) {
    return <p className="text-center text-gray-500">Loading map...</p>;
  }

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-lg">
      <Map
        height={300}               
        center={coords}            
        zoom={6}
      >
        <ZoomControl />
        <Marker width={50} anchor={coords} />
      </Map>
    </div>
  );
}

export default MapComponent;

