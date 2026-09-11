import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import type { WeatherData } from "../services/Weather";

export interface CropSummary {
  cropId: string;
  cropName: string;
  season?: string;
  stage?: string;
  moisture?: number;
  location?: {
    lat: number;
    lng: number;
  };
}

interface FarmContextValue {
  farmerName: string;
  crops: CropSummary[];
  loading: boolean;
  farmLocation: { lat: number; lng: number } | null;
  avgMoisture: number;
  geoTagged: number;
  weatherData: WeatherData | undefined;
  setWeatherData: (data: WeatherData | undefined) => void;
}

const FarmContext = createContext<FarmContextValue | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farmerName, setFarmerName] = useState("");
  const [crops, setCrops] = useState<CropSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmLocation, setFarmLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData>();

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        const token =
          localStorage.getItem("farmerToken") || localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:8000/api/farmers/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;

        const data = await response.json();
        if (data?.farmer?.name) setFarmerName(data.farmer.name);
      } catch (error) {
        console.error("Error fetching farmer:", error);
      }
    };

    fetchFarmer();
  }, []);

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const token =
          localStorage.getItem("farmerToken") || localStorage.getItem("token");

        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get("http://localhost:8000/api/crops/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const allCrops = Array.isArray(response.data?.crops)
          ? response.data.crops
          : [];

        setCrops(allCrops);

        const locatedCrop = allCrops.find(
          (crop: CropSummary) =>
            crop.location &&
            typeof crop.location.lat === "number" &&
            typeof crop.location.lng === "number",
        );

        if (locatedCrop?.location) setFarmLocation(locatedCrop.location);
      } catch (error) {
        console.error("Error fetching farmer crops:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCrops();
  }, []);

  const avgMoisture = useMemo(() => {
    const values = crops
      .map((crop) => crop.moisture)
      .filter((value): value is number => typeof value === "number");

    if (!values.length) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [crops]);

  const geoTagged = useMemo(
    () => crops.filter((crop) => !!crop.location).length,
    [crops],
  );

  const value = useMemo<FarmContextValue>(
    () => ({
      farmerName,
      crops,
      loading,
      farmLocation,
      avgMoisture,
      geoTagged,
      weatherData,
      setWeatherData,
    }),
    [farmerName, crops, loading, farmLocation, avgMoisture, geoTagged, weatherData],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) {
    throw new Error("useFarm must be used within a FarmProvider");
  }
  return ctx;
}