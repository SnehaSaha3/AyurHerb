import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  CloudRain,
  Droplets,
  MapPinned,
  Sprout,
} from "lucide-react";

import WeatherCard from "../services/Weather";
import FarmerBusinessActivity from "../business/FarmerBusinessActivity";
import FarmerGreeting from "../services/Greeting";

import { useFarm } from "./FarmContext";
import DashboardInsight from "../dashboard/Dashboardinsights";

export default function FarmerHome() {
  const navigate = useNavigate();

  const {
    farmerName,
    crops,
    loading,
    farmLocation,
    avgMoisture,
    geoTagged,
    weatherData,
    setWeatherData,
  } = useFarm();

  const [showWeather, setShowWeather] = useState(false);

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">

      {/* =====================================================
          GREETING
         ===================================================== */}

      <section
        className="
          relative overflow-hidden rounded-3xl
          border border-white/70
          bg-white/42
          p-6
          shadow-[0_15px_45px_rgba(30,70,35,0.06)]
          backdrop-blur-2xl
          sm:p-8
        "
      >
        <div className="relative z-10">

          <FarmerGreeting />

          <h1
            className="
              mt-1 text-3xl font-semibold
              tracking-tight text-[#16321f]
              sm:text-4xl
            "
          >
            {farmerName || "Farmer"}
          </h1>

          <p className="mt-2 text-sm text-[#6b7a68]">
            Here&apos;s what&apos;s happening on your farm today.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">

            <div
              className="
                flex items-center gap-2
                rounded-full
                border border-white/70
                bg-[#eaf4e7]/65
                px-3 py-1.5
                text-xs font-medium
                text-[#1f7a3d]
                backdrop-blur-md
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#1f7a3d]" />
              Farm connected
            </div>

            <div
              className="
                rounded-full
                border border-white/70
                bg-white/38
                px-3 py-1.5
                text-xs text-[#6b7a68]
                backdrop-blur-md
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
          CROPS + FIELD CONDITIONS
         ===================================================== */}

      <div
        className="
          grid grid-cols-1 gap-5
          lg:grid-cols-[1.4fr_1fr]
        "
      >

        {/* ===================================================
            YOUR CROPS
           =================================================== */}

        <section
          className="
            rounded-2xl
            border border-white/70
            bg-white/52
            p-5
            shadow-[0_10px_35px_rgba(30,70,35,0.05)]
            backdrop-blur-2xl
          "
        >

          <div className="mb-4 flex items-center justify-between">

            <h2
              className="
                flex items-center gap-2
                text-[15px] font-semibold
                text-[#16321f]
              "
            >
              <Sprout className="h-4 w-4 text-[#1f7a3d]" />
              Your Crops
            </h2>

            <button
              onClick={() =>
                navigate("/farmer-dashboard/crops")
              }
              className="
                flex items-center gap-1
                text-xs font-medium
                text-[#1f7a3d]
                hover:underline
              "
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </button>

          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-[#8a9a87]">
              Loading your crops...
            </p>
          ) : crops.length === 0 ? (
            <div
              className="
                rounded-xl
                border border-dashed border-white/80
                bg-white/35
                py-8 text-center
                backdrop-blur-xl
              "
            >
              <p className="text-sm text-[#5c6b58]">
                No crops registered yet.
              </p>

              <button
                onClick={() =>
                  navigate("/farmer-dashboard/crops")
                }
                className="
                  mt-2 text-xs font-medium
                  text-[#1f7a3d]
                  hover:underline
                "
              >
                Add your first crop
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              {crops.slice(0, 3).map((crop) => (
                <div
                  key={crop.cropId}
                  className="min-w-0"
                >

                  <div
                    className="
                      flex aspect-square
                      items-center justify-center
                      overflow-hidden rounded-xl
                      border border-white/60
                      bg-white/38
                      backdrop-blur-xl
                    "
                  >
                    <Sprout
                      className="h-8 w-8 text-[#1f7a3d]"
                      strokeWidth={1.5}
                    />
                  </div>

                  <p
                    className="
                      mt-2 truncate
                      text-sm font-semibold
                      text-[#16321f]
                    "
                  >
                    {crop.cropName}
                  </p>

                  {crop.stage && (
                    <span
                      className="
                        mt-1 inline-flex
                        items-center gap-1
                        rounded-full
                        border border-white/60
                        bg-[#e6f4e1]/65
                        px-2 py-0.5
                        text-[11px] font-medium
                        text-[#1f7a3d]
                        backdrop-blur-md
                      "
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {crop.stage}
                    </span>
                  )}

                  {crop.season && (
                    <p className="mt-1.5 text-xs text-[#6b7a68]">
                      Season: {crop.season}
                    </p>
                  )}

                  {crop.location && (
                    <p className="flex items-center gap-1 text-xs text-[#8a9a87]">
                      <MapPinned className="h-3 w-3" />
                      Geo-tagged
                    </p>
                  )}

                </div>
              ))}

              {/* ADD CROP */}

              <button
                onClick={() =>
                  navigate("/farmer-dashboard/crops")
                }
                className="
                  flex min-h-[168px]
                  flex-col items-center
                  justify-center gap-2
                  rounded-xl
                  border border-dashed
                  border-white/80
                  bg-white/30
                  text-[#5c6b58]
                  backdrop-blur-xl
                  transition-none
                  hover:bg-white/45
                "
              >

                <div
                  className="
                    flex h-9 w-9
                    items-center justify-center
                    rounded-full
                    border border-white/70
                    bg-[#e6f4e1]/70
                    text-[#1f7a3d]
                  "
                >
                  <Sprout className="h-4 w-4" />
                </div>

                <span className="text-sm font-medium">
                  Add Crop
                </span>

                <span className="text-[11px] text-[#8a9a87]">
                  Track a new crop
                </span>

              </button>

            </div>
          )}
        </section>

        {/* ===================================================
            FIELD CONDITIONS
           =================================================== */}

        <section
          className="
            rounded-2xl
            border border-white/70
            bg-white/52
            p-5
            shadow-[0_10px_35px_rgba(30,70,35,0.05)]
            backdrop-blur-2xl
          "
        >

          <div className="mb-4 flex items-center justify-between">

            <h2
              className="
                flex items-center gap-2
                text-[15px] font-semibold
                text-[#16321f]
              "
            >
              <MapPinned className="h-4 w-4 text-[#1f7a3d]" />
              Field Conditions
            </h2>

            {farmLocation && (
              <span className="text-[10px] text-[#8a9a87]">
                Near your farm
              </span>
            )}

          </div>

          <div
            className="
              rounded-xl
              border border-white/55
              bg-[#eef4fb]/55
              p-4
              backdrop-blur-xl
            "
          >

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex h-12 w-12
                    items-center justify-center
                    rounded-full
                    border border-white/60
                    bg-white/45
                    backdrop-blur-md
                  "
                >
                  <CloudRain
                    className="h-7 w-7 text-[#5b9bd5]"
                    strokeWidth={1.8}
                  />
                </div>

                <div>

                  <p
                    className="
                      text-2xl font-semibold
                      text-[#16321f]
                    "
                  >
                    {weatherData?.temp != null
                      ? `${weatherData.temp}°C`
                      : "--"}
                  </p>

                  <p className="text-xs text-[#5c6b58]">
                    {farmLocation
                      ? "Current local conditions"
                      : "No farm location yet"}
                  </p>

                </div>

              </div>

              <div className="text-right">

                <div
                  className="
                    flex items-center gap-1.5
                    text-xs text-[#4a5a47]
                  "
                >
                  <Droplets
                    className="h-3.5 w-3.5 text-[#5b9bd5]"
                  />

                  {crops.length
                    ? `${avgMoisture}%`
                    : "--"}
                </div>

                <p className="mt-0.5 text-[10px] text-[#8a9a87]">
                  Avg. moisture
                </p>

              </div>

            </div>

          </div>

          <button
            onClick={() =>
              setShowWeather((prev) => !prev)
            }
            disabled={!farmLocation}
            className="
              mt-3 flex w-full
              items-center justify-center gap-1
              rounded-xl
              border border-white/70
              bg-white/30
              py-2.5
              text-xs font-medium
              text-[#1f7a3d]
              backdrop-blur-xl
              transition-none
              hover:bg-white/45
              disabled:cursor-not-allowed
              disabled:text-[#a3b09f]
            "
          >
            {showWeather
              ? "Hide conditions"
              : "View local conditions"}
          </button>

        </section>
      </div>

      {/* =====================================================
          LOCAL WEATHER
         ===================================================== */}

      {showWeather && farmLocation && (
        <section
          className="
            rounded-2xl
            border border-white/70
            bg-white/52
            p-5
            shadow-[0_10px_35px_rgba(30,70,35,0.05)]
            backdrop-blur-2xl
            sm:p-6
          "
        >

          <p
            className="
              text-[11px] font-semibold
              uppercase tracking-[0.18em]
              text-[#9aa897]
            "
          >
            Local conditions
          </p>

          <p className="mt-1 text-sm text-[#6b7a68]">
            Weather around your farm
          </p>

          <div className="mt-4">
            <WeatherCard
              lat={farmLocation.lat}
              lng={farmLocation.lng}
              setWeatherData={setWeatherData}
            />
          </div>

        </section>
      )}

      {/* =====================================================
          FARM INTELLIGENCE
          
          IMPORTANT:
          This is deliberately AFTER Your Crops,
          Field Conditions and Weather.
         ===================================================== */}

      <DashboardInsight />

      {/* =====================================================
          BUSINESS ACTIVITY
         ===================================================== */}

      <section>

        <div className="mb-3 px-1">

          <p
            className="
              text-[10px] font-semibold
              uppercase tracking-[0.18em]
              text-[#142e0f]
            "
          >
            Business
          </p>

          <h2
            className="
              mt-1 text-base
              font-semibold
              text-[#16321f]
            "
          >
            Recent activity
          </h2>

        </div>

        <FarmerBusinessActivity />

      </section>

    </div>
  );
}