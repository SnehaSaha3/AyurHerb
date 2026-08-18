import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CloudRain,
  Droplets,
  Leaf,
  MapPinned,
  Sparkles,
  Sprout,
} from "lucide-react";

import ChatbotCard from "../ChatbotCard";

import WeatherCard, {
  type WeatherData,
} from "../services/Weather";

import FarmerBusinessActivity from "../business/FarmerBusinessActivity";

import FarmerGreeting from "../../components/services/Greeting";


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


export default function FarmerHome() {

  const navigate = useNavigate();


  /* =========================================================
     FARM DATA
  ========================================================= */

  const [crops, setCrops] =
    useState<CropSummary[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [farmLocation, setFarmLocation] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);


  /* =========================================================
     WEATHER
  ========================================================= */

  const [weatherData, setWeatherData] =
    useState<WeatherData>();

  const [showWeather, setShowWeather] =
    useState(false);


  /* =========================================================
     TEMPORARY RECOMMENDATIONS
  ========================================================= */

  const recommendations: CropRecommendation[] = [
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
  ];


  /* =========================================================
     FETCH CROPS
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

        const response = await axios.get(
          "http://localhost:8000/api/crops/mine",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        const allCrops =
          Array.isArray(
            response.data?.crops
          )
            ? response.data.crops
            : [];

        setCrops(allCrops);

        const locatedCrop =
          allCrops.find(
            (crop: CropSummary) =>
              crop.location &&
              typeof crop.location.lat ===
                "number" &&
              typeof crop.location.lng ===
                "number"
          );

        if (locatedCrop?.location) {
          setFarmLocation(
            locatedCrop.location
          );
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
     SIMPLE FARM METRICS
  ========================================================= */

  const avgMoisture = useMemo(() => {

    const values = crops
      .map(
        (crop) => crop.moisture
      )
      .filter(
        (
          value
        ): value is number =>
          typeof value === "number"
      );

    if (!values.length) {
      return 0;
    }

    return Math.round(
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / values.length
    );

  }, [crops]);


  const geoTagged = useMemo(
    () =>
      crops.filter(
        (crop) =>
          !!crop.location
      ).length,
    [crops]
  );


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <div className="space-y-6 pb-10">


      {/* =====================================================
          GREETING / HERO
      ===================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[30px]
          border
          border-white/80
          bg-white/55
          p-5
          shadow-[0_25px_70px_rgba(35,75,40,0.07)]
          backdrop-blur-[35px]
          sm:p-6
          md:p-8
        "
      >

        {/* ambient glow */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -right-20
            -top-24
            h-64
            w-64
            rounded-full
            bg-green-300/15
            blur-[80px]
          "
        />

        <div className="relative">

          <FarmerGreeting />


          <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div className="max-w-2xl">

              <h1
                className="
                  text-3xl
                  font-semibold
                  tracking-[-0.04em]
                  text-gray-900
                  sm:text-4xl
                  md:text-[42px]
                "
              >
                Your farm,
                <span className="text-green-600">
                  {" "}at a glance.
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
                Monitor your crops, understand
                current conditions and make
                better farming decisions.
              </p>

            </div>


            <button
              onClick={() =>
                navigate(
                  "/farmer-dashboard/analytics"
                )
              }
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-white
                bg-white/70
                px-4
                py-3
                text-xs
                font-semibold
                text-green-700
                shadow-sm
                transition
                hover:-translate-y-0.5
                hover:bg-white
                sm:w-fit
              "
            >
              <BarChart3 size={16} />

              View analytics

              <ArrowRight size={14} />
            </button>

          </div>


          {/* STATUS */}

          <div className="mt-6 flex flex-wrap gap-2">

            <div
              className="
                flex
                items-center
                gap-2
                rounded-full
                border
                border-green-100
                bg-green-50/70
                px-3
                py-1.5
                text-xs
                font-medium
                text-green-700
              "
            >
              <CheckCircle2 size={14} />
              Farm connected
            </div>

            <div
              className="
                rounded-full
                border
                border-white
                bg-white/55
                px-3
                py-1.5
                text-xs
                text-gray-500
              "
            >
              {loading
                ? "Loading crops..."
                : `${crops.length} registered ${
                    crops.length === 1
                      ? "crop"
                      : "crops"
                  }`}
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          FARM SNAPSHOT
      ===================================================== */}

      <section>

        <div className="mb-3 flex items-center justify-between px-1">

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Farm snapshot
          </p>

          <button
            onClick={() =>
              navigate(
                "/farmer-dashboard/analytics"
              )
            }
            className="
              hidden
              text-xs
              font-medium
              text-green-600
              hover:text-green-700
              sm:block
            "
          >
            Detailed analytics →
          </button>

        </div>


        <div
          className="
            grid
            grid-cols-2
            overflow-hidden
            rounded-[25px]
            border
            border-white/80
            bg-white/55
            shadow-[0_20px_60px_rgba(35,75,40,0.06)]
            backdrop-blur-[30px]
            lg:grid-cols-4
          "
        >

          <Metric
            icon={<Sprout size={18} />}
            label="Registered crops"
            value={
              loading
                ? "—"
                : crops.length
            }
            description="Active crop records"
          />


          <Metric
            icon={<Droplets size={18} />}
            label="Average moisture"
            value={
              loading
                ? "—"
                : crops.length
                ? `${avgMoisture}%`
                : "--"
            }
            description="From available data"
          />


          <Metric
            icon={<MapPinned size={18} />}
            label="Geo verified"
            value={
              loading
                ? "—"
                : geoTagged
            }
            description="Location-tagged crops"
          />


          <button
            onClick={() =>
              setShowWeather(
                (previous) =>
                  !previous
              )
            }
            className="
              border-t
              border-white/70
              p-5
              text-left
              transition
              hover:bg-white/50
              sm:p-6
              lg:border-l
              lg:border-t-0
            "
          >

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs text-gray-500">
                  Weather
                </p>

                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {weatherData?.temp != null
                    ? `${weatherData.temp}°`
                    : "--"}
                </p>

              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CloudRain size={18} />
              </div>

            </div>

            <p className="mt-2 text-[10px] text-green-600">
              {showWeather
                ? "Hide conditions"
                : "View local conditions"}
            </p>

          </button>

        </div>

      </section>


      {/* =====================================================
          WEATHER
      ===================================================== */}

      {showWeather && farmLocation && (

        <section
          className="
            rounded-[25px]
            border
            border-white/80
            bg-white/55
            p-5
            shadow-[0_20px_60px_rgba(35,75,40,0.06)]
            backdrop-blur-[30px]
            sm:p-6
          "
        >

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Local conditions
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Weather around your farm
          </p>

          <div className="mt-4">

            <WeatherCard
              lat={farmLocation.lat}
              lng={farmLocation.lng}
              setWeatherData={
                setWeatherData
              }
            />

          </div>

        </section>

      )}


      {/* =====================================================
          RECOMMENDATIONS
      ===================================================== */}

      <section
        className="
          rounded-[25px]
          border
          border-white/80
          bg-white/55
          p-5
          shadow-[0_20px_60px_rgba(35,75,40,0.06)]
          backdrop-blur-[30px]
          sm:p-6
        "
      >

        <div className="flex items-start justify-between gap-3">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Leaf size={18} />
            </div>

            <div>

              <h2 className="text-base font-semibold text-gray-900">
                Crop recommendations
              </h2>

              <p className="text-xs text-gray-400">
                Opportunities for your farm
              </p>

            </div>

          </div>


          <button
            onClick={() =>
              navigate(
                "/farmer-dashboard/recommendations"
              )
            }
            className="
              hidden
              text-xs
              font-semibold
              text-green-600
              sm:block
            "
          >
            View all
          </button>

        </div>


        <div className="mt-5 grid gap-2 lg:grid-cols-3">

          {recommendations
            .map(
              (
                recommendation,
                index
              ) => (

                <div
                  key={
                    recommendation.cropName
                  }
                  className="
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-white
                    bg-white/45
                    p-3
                    transition
                    hover:bg-white/70
                  "
                >

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xs font-bold text-green-700">
                    {index + 1}
                  </div>


                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <p className="text-sm font-semibold text-gray-800">
                        {
                          recommendation.cropName
                        }
                      </p>

                      {recommendation.demand && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-semibold text-green-700">
                          {
                            recommendation.demand
                          }
                        </span>
                      )}

                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                      {
                        recommendation.reason
                      }
                    </p>

                  </div>


                  <div className="shrink-0 text-right">

                    <p className="text-sm font-bold text-green-600">
                      {
                        recommendation.score
                      }%
                    </p>

                    <p className="text-[9px] text-gray-400">
                      fit
                    </p>

                  </div>

                </div>

              )
            )}

        </div>


        <button
          onClick={() =>
            navigate(
              "/farmer-dashboard/recommendations"
            )
          }
          className="
            mt-4
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-green-600
            py-3
            text-xs
            font-semibold
            text-white
            shadow-[0_10px_30px_rgba(34,197,94,0.18)]
            transition
            hover:bg-green-700
          "
        >
          Explore recommendations
          <ArrowRight size={14} />
        </button>

      </section>


      {/* =====================================================
          AYURMATE
      ===================================================== */}

      <section
        className="
          flex
          min-h-[340px]
          flex-col
          overflow-hidden
          rounded-[25px]
          border
          border-white/80
          bg-white/55
          shadow-[0_20px_60px_rgba(35,75,40,0.06)]
          backdrop-blur-[30px]
        "
      >

        <div className="border-b border-white/70 px-5 py-4 sm:px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Sparkles size={17} />
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


        <div className="min-h-[280px] flex-1 p-4">

          <ChatbotCard
            farmLocation={farmLocation}
            weatherData={weatherData}
          />

        </div>

      </section>


      {/* =====================================================
          BUSINESS ACTIVITY
      ===================================================== */}

      <section>

        <div className="mb-3 px-1">

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Business
          </p>

          <h2 className="mt-1 text-base font-semibold text-gray-900">
            Recent activity
          </h2>

        </div>

        <FarmerBusinessActivity />

      </section>

    </div>
  );
}


/* =============================================================
   METRIC
============================================================= */

function Metric({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {

  return (

    <div
      className="
        p-5
        transition
        hover:bg-white/45
        sm:p-6
      "
    >

      <div className="flex items-start justify-between gap-2">

        <div className="min-w-0">

          <p className="truncate text-xs text-gray-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
            {value}
          </p>

        </div>


        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
          {icon}
        </div>

      </div>


      <p className="mt-2 text-[10px] text-gray-400">
        {description}
      </p>

    </div>

  );
}