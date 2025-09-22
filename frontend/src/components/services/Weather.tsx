import { useEffect, useState } from "react";
import axios from "axios";

export interface WeatherData {
  temp: number;
  description: string;
  rainChance?: number;
  humidity: number;
  windSpeed: number;
}

interface WeatherProps {
  lat: number;
  lng: number;
  setWeatherData?: (data: WeatherData) => void;
}

export default function Weather({ lat, lng, setWeatherData }: WeatherProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5000/api/weather?lat=${lat}&lon=${lng}`);
        setWeather(res.data);
        if (setWeatherData) setWeatherData(res.data);
      } catch (err) {
        console.error("Error fetching weather:", err);
      } finally {
        setLoading(false);
      }
    };

    if (lat && lng) fetchWeather();
  }, [lat, lng, setWeatherData]);

  if (loading) return <p>Loading weather...</p>;
  if (!weather) return <p>Weather data not available</p>;

  return (
    <div className="bg-blue-50 p-4 rounded-lg shadow space-y-2">
      <h2 className="text-xl font-semibold">🌤 Weather & Alerts</h2>
      <p className="text-lg font-bold">{weather.temp}°C</p>
      <p className="capitalize">{weather.description}</p>
      <p>Humidity: {weather.humidity}%</p>
      <p>Wind: {weather.windSpeed} m/s</p>
      {weather.rainChance && weather.rainChance > 50 && (
        <p className="text-red-600 font-bold">⚠️ Rain expected soon!</p>
      )}
    </div>
  );
}
