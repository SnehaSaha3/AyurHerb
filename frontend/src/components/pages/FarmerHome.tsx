import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ChatbotCard from "../ChatbotCard";
import WeatherCard, { type WeatherData } from "../services/Weather";

import {
  ArrowRight,
  CheckCircle2,
  CloudRain,
  Droplets,
  Leaf,
  MapPinned,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  Sprout,
  WalletCards,
} from "lucide-react";

interface CropSummary {
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

interface CropRecommendation {
  cropName: string;
  score: number;
  demand?: "Low" | "Medium" | "High";
  reason: string;
}

interface Activity {
  id: string;
  type: "payment" | "message" | "invoice" | "shipment";
  title: string;
  description: string;
  time: string;
}

export default function FarmerHome() {
  const navigate = useNavigate();

  const [crops, setCrops] = useState<CropSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [farmLocation, setFarmLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [weatherData, setWeatherData] =
    useState<WeatherData>();

  const [showWeather, setShowWeather] = useState(false);

  /*
   * Recommendation engine results.
   *
   * Replace the fallback data with your actual
   * recommendation API once that endpoint is connected.
   */
  const [recommendations, setRecommendations] =
    useState<CropRecommendation[]>([
      {
        cropName: "Turmeric",
        score: 81,
        demand: "Medium",
        reason:
          "Good compatibility with your soil and current season.",
      },
      {
        cropName: "Ashwagandha",
        score: 74,
        demand: "High",
        reason:
          "Suitable regional conditions with strong market demand.",
      },
      {
        cropName: "Tulsi",
        score: 69,
        demand: "Medium",
        reason:
          "Good seasonal compatibility for your location.",
      },
    ]);

  /*
   * Demo business activity.
   *
   * Later this should come from your order/payment/
   * invoice/message activity API.
   */
  const [activities] = useState<Activity[]>([
    {
      id: "payment-1",
      type: "payment",
      title: "Payment received",
      description:
        "₹5,000 advance received for your crop order.",
      time: "2 min ago",
    },
    {
      id: "message-1",
      type: "message",
      title: "New message from buyer",
      description:
        "AyurLife Pvt Ltd sent you a message.",
      time: "18 min ago",
    },
    {
      id: "invoice-1",
      type: "invoice",
      title: "Invoice generated",
      description:
        "Invoice INV-1024 is ready to view.",
      time: "1 hour ago",
    },
    {
      id: "shipment-1",
      type: "shipment",
      title: "Shipment ready",
      description:
        "QR code generated for Batch AH-1024.",
      time: "2 hours ago",
    },
  ]);

  /* =========================================================
     FETCH FARMER CROPS
  ========================================================= */

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const token =
          localStorage.getItem("farmerToken") ||
          localStorage.getItem("token");

        if (!token) {
          setLoading(false);
          return;
        }

        const res = await axios.get(
          "http://localhost:8000/api/crops/mine",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const allCrops = Array.isArray(res.data?.crops)
          ? res.data.crops
          : [];

        setCrops(allCrops);

        /*
         * Use the first geo-tagged crop as the farm
         * location for now.
         */
        const locatedCrop = allCrops.find(
          (crop: CropSummary) => crop.location
        );

        if (locatedCrop?.location) {
          setFarmLocation(locatedCrop.location);
        }
      } catch (error) {
        console.error(
          "Error fetching farmer crops:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCrops();
  }, []);

  /* =========================================================
     DERIVED FARM DATA
  ========================================================= */

  const avgMoisture = useMemo(() => {
    const values = crops
      .map((crop) => crop.moisture)
      .filter(
        (value): value is number =>
          typeof value === "number"
      );

    if (!values.length) return 0;

    return Math.round(
      values.reduce((sum, value) => sum + value, 0) /
        values.length
    );
  }, [crops]);

  const geoTagged = useMemo(() => {
    return crops.filter((crop) => crop.location).length;
  }, [crops]);

  const weatherTemperature = weatherData?.temp;

  /* =========================================================
     RECOMMENDATION API

     Uncomment/adapt this when your recommendation
     endpoint is ready.
  ========================================================= */

  /*
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const token =
          localStorage.getItem("farmerToken");

        if (!token) return;

        const res = await axios.get(
          "http://localhost:8000/api/recommendations/mine",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.data?.success) {
          setRecommendations(
            res.data.recommendations
          );
        }
      } catch (error) {
        console.error(
          "Recommendation engine error:",
          error
        );
      }
    };

    fetchRecommendations();
  }, []);
  */

  /* =========================================================
     ACTIVITY ICON
  ========================================================= */

  const getActivityIcon = (
    type: Activity["type"]
  ) => {
    switch (type) {
      case "payment":
        return (
          <WalletCards
            size={18}
            strokeWidth={1.8}
          />
        );

      case "message":
        return (
          <MessageCircle
            size={18}
            strokeWidth={1.8}
          />
        );

      case "invoice":
        return (
          <ReceiptText
            size={18}
            strokeWidth={1.8}
          />
        );

      case "shipment":
        return (
          <PackageCheck
            size={18}
            strokeWidth={1.8}
          />
        );

      default:
        return <Leaf size={18} />;
    }
  };

  const getActivityStyle = (
    type: Activity["type"]
  ) => {
    switch (type) {
      case "payment":
        return "bg-emerald-50 text-emerald-600";

      case "message":
        return "bg-blue-50 text-blue-600";

      case "invoice":
        return "bg-violet-50 text-violet-600";

      case "shipment":
        return "bg-orange-50 text-orange-600";

      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div className="space-y-5 pb-8">

      {/* =====================================================
          GREETING
      ===================================================== */}

      <section className="px-1">

        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-green-600">
          Your farm today
        </p>

        <div className="mt-1 flex items-end justify-between gap-4">

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-[28px]">
              Good to see you again.
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Here's what's happening with your
              farm today.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-green-100 bg-green-50/70 px-3 py-1.5 text-xs font-medium text-green-700 sm:flex">
            <CheckCircle2 size={14} />
            Farm connected
          </div>

        </div>

      </section>

      {/* =====================================================
          FARM OVERVIEW
      ===================================================== */}

      <section>

        <div className="mb-3 flex items-center justify-between px-1">

          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            Farm overview
          </h2>

        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

          {/* Crops */}

          <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-[0_8px_30px_rgba(40,80,45,0.05)] backdrop-blur-xl">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs text-gray-500">
                  My crops
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? "—" : crops.length}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <Sprout size={18} />
              </div>

            </div>

            <p className="mt-2 text-[11px] text-gray-400">
              Registered crops
            </p>

          </div>

          {/* Moisture */}

          <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-[0_8px_30px_rgba(40,80,45,0.05)] backdrop-blur-xl">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs text-gray-500">
                  Avg. moisture
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading
                    ? "—"
                    : crops.length
                    ? `${avgMoisture}%`
                    : "--"}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Droplets size={18} />
              </div>

            </div>

            <p className="mt-2 text-[11px] text-gray-400">
              Based on available crop data
            </p>

          </div>

          {/* Geo */}

          <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-[0_8px_30px_rgba(40,80,45,0.05)] backdrop-blur-xl">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs text-gray-500">
                  Geo verified
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? "—" : geoTagged}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <MapPinned size={18} />
              </div>

            </div>

            <p className="mt-2 text-[11px] text-gray-400">
              Location verified crops
            </p>

          </div>

          {/* Weather */}

          <button
            onClick={() =>
              setShowWeather((previous) => !previous)
            }
            className="
              text-left
              rounded-2xl
              border
              border-white
              bg-white/80
              p-4
              shadow-[0_8px_30px_rgba(40,80,45,0.05)]
              backdrop-blur-xl
              transition
              hover:-translate-y-0.5
              hover:bg-white
            "
          >

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs text-gray-500">
                  Weather
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {weatherTemperature != null
                    ? `${weatherTemperature}°`
                    : "--"}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CloudRain size={18} />
              </div>

            </div>

            <p className="mt-2 text-[11px] text-green-600">
              {showWeather
                ? "Hide weather"
                : "View local weather"}
            </p>

          </button>

        </div>

      </section>

      {/* =====================================================
          WEATHER EXPANDED
      ===================================================== */}

      {showWeather && farmLocation && (
        <section
          className="
            rounded-2xl
            border
            border-white
            bg-white/80
            p-4
            shadow-[0_8px_30px_rgba(40,80,45,0.05)]
            backdrop-blur-xl
          "
        >
          <div className="mb-3">

            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
              Local conditions
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Weather around your farm
            </p>

          </div>

          <WeatherCard
            lat={farmLocation.lat}
            lng={farmLocation.lng}
            setWeatherData={setWeatherData}
          />

        </section>
      )}

      {/* =====================================================
          RECOMMENDATIONS + AYURMATE
      ===================================================== */}

      <section className="grid gap-5 xl:grid-cols-[1.6fr_0.9fr]">

        {/* ---------------------------------------------------
            RECOMMENDATIONS
        --------------------------------------------------- */}

        <div
          className="
            rounded-2xl
            border
            border-white
            bg-white/80
            p-5
            shadow-[0_8px_30px_rgba(40,80,45,0.05)]
            backdrop-blur-xl
          "
        >

          <div className="flex items-start justify-between gap-4">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <Leaf size={18} />
                </div>

                <div>

                  <h2 className="text-base font-semibold text-gray-900">
                    Crop recommendations
                  </h2>

                  <p className="text-xs text-gray-400">
                    Based on your farm conditions
                  </p>

                </div>

              </div>

            </div>

            <button
              onClick={() =>
                navigate(
                  "/farmer-dashboard/recommendations"
                )
              }
              className="hidden items-center gap-1 text-xs font-semibold text-green-600 transition hover:text-green-700 sm:flex"
            >
              View all
              <ArrowRight size={14} />
            </button>

          </div>

          <div className="mt-5 divide-y divide-gray-100">

            {recommendations
              .slice(0, 3)
              .map((recommendation, index) => (
                <div
                  key={recommendation.cropName}
                  className="
                    flex
                    items-center
                    gap-3
                    py-4
                    first:pt-0
                    last:pb-0
                  "
                >

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-sm font-semibold text-green-700">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <p className="text-sm font-semibold text-gray-800">
                        {recommendation.cropName}
                      </p>

                      {recommendation.demand && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-semibold text-green-700">
                          {recommendation.demand} demand
                        </span>
                      )}

                    </div>

                    <p className="mt-1 truncate text-xs text-gray-400">
                      {recommendation.reason}
                    </p>

                  </div>

                  <div className="shrink-0 text-right">

                    <p className="text-sm font-bold text-green-600">
                      {recommendation.score}%
                    </p>

                    <p className="text-[9px] text-gray-400">
                      suitability
                    </p>

                  </div>

                </div>
              ))}

          </div>

          <button
            onClick={() =>
              navigate(
                "/farmer-dashboard/recommendations"
              )
            }
            className="
              mt-5
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-green-200
              py-2.5
              text-xs
              font-semibold
              text-green-700
              transition
              hover:bg-green-50
            "
          >
            Explore recommendations
            <ArrowRight size={14} />
          </button>

        </div>

        {/* ---------------------------------------------------
            AYURMATE
        --------------------------------------------------- */}

        <div
          className="
            flex
            min-h-[330px]
            flex-col
            overflow-hidden
            rounded-2xl
            border
            border-white
            bg-white/80
            shadow-[0_8px_30px_rgba(40,80,45,0.05)]
            backdrop-blur-xl
          "
        >

          <div className="border-b border-gray-100 px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <Sprout size={18} />
              </div>

              <div>

                <h2 className="text-sm font-semibold text-gray-900">
                  AyurMate
                </h2>

                <p className="text-xs text-gray-400">
                  Your farming assistant
                </p>

              </div>

            </div>

          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-4">

            <ChatbotCard
              farmLocation={farmLocation}
              weatherData={weatherData}
            />

          </div>

        </div>

      </section>

      {/* =====================================================
          BUSINESS ACTIVITY
      ===================================================== */}

      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-white
          bg-white/80
          shadow-[0_8px_30px_rgba(40,80,45,0.05)]
          backdrop-blur-xl
        "
      >

        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <WalletCards size={18} />
            </div>

            <div>

              <h2 className="text-sm font-semibold text-gray-900">
                Business activity
              </h2>

              <p className="text-xs text-gray-400">
                Orders, payments and buyer communication
              </p>

            </div>

          </div>

          <button
            onClick={() =>
              navigate(
                "/farmer-dashboard/activity"
              )
            }
            className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700"
          >
            View all
            <ArrowRight size={14} />
          </button>

        </div>

        <div className="divide-y divide-gray-100">

          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => {
                if (activity.type === "message") {
                  navigate(
                    "/farmer-dashboard/messages"
                  );
                }
              }}
              className="
                flex
                w-full
                items-center
                gap-3
                px-5
                py-3.5
                text-left
                transition
                hover:bg-gray-50/80
              "
            >

              <div
                className={`
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  ${getActivityStyle(activity.type)}
                `}
              >
                {getActivityIcon(activity.type)}
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-sm font-semibold text-gray-800">
                  {activity.title}
                </p>

                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {activity.description}
                </p>

              </div>

              <div className="flex shrink-0 items-center gap-2">

                <span className="text-[10px] text-gray-400">
                  {activity.time}
                </span>

                <ArrowRight
                  size={14}
                  className="text-gray-300"
                />

              </div>

            </button>
          ))}

        </div>

      </section>

    </div>
  );
}