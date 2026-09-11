import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  CloudRain,
  Droplets,
  MapPinned,
  Sprout,
  TrendingUp,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import WeatherCard from "../services/Weather";
import FarmerBusinessActivity from "../business/FarmerBusinessActivity";
import FarmerGreeting from "../services/Greeting";

import { useFarm } from "./FarmContext";

interface CropRecommendation {
  cropName: string;
  score: number;
  demand?: "Low" | "Medium" | "High";
  reason: string;
}

const demandToScore: Record<
  NonNullable<CropRecommendation["demand"]>,
  number
> = {
  Low: 25,
  Medium: 55,
  High: 85,
};

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

  /* =========================================================
     RULE-BASED MARKET OPPORTUNITIES
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
     SOIL DATA
     ========================================================= */

  const moistureByCrop = useMemo(
    () =>
      crops
        .filter(
          (crop) =>
            typeof crop.moisture === "number",
        )
        .map((crop, index) => ({
          name: crop.cropName,
          moisture: crop.moisture as number,
          index: index + 1,
        })),
    [crops],
  );

  /* =========================================================
     MARKET OPPORTUNITY DATA
     ========================================================= */

  const marketData = useMemo(
    () =>
      recommendations.map((recommendation) => ({
        cropName: recommendation.cropName,
        suitability: recommendation.score,
        demand: recommendation.demand
          ? demandToScore[recommendation.demand]
          : 50,
        demandLabel:
          recommendation.demand ?? "—",
      })),
    [recommendations],
  );

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      {/* =====================================================
          GREETING / HEADER
          GLASS
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
                text-xs font-medium text-[#1f7a3d]
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
            CROPS
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
                text-xs font-medium text-[#1f7a3d]
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
                  text-[#1f7a3d] hover:underline
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
              py-2.5 text-xs font-medium
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
          SOIL MOISTURE
          ===================================================== */}

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
          <div>
            <h2
              className="
                flex items-center gap-2
                text-[15px] font-semibold
                text-[#16321f]
              "
            >
              <Droplets className="h-4 w-4 text-[#1f7a3d]" />
              Soil Moisture Trend
            </h2>

            <p className="mt-0.5 text-xs text-[#8a9a87]">
              Current moisture readings across your crops.
            </p>
          </div>

          <div
            className="
              hidden items-center gap-1
              rounded-full
              border border-white/60
              bg-[#eaf4e7]/65
              px-2.5 py-1
              text-[10px] font-medium
              text-[#1f7a3d]
              backdrop-blur-md
              sm:flex
            "
          >
            <TrendingUp className="h-3 w-3" />
            Live readings
          </div>
        </div>

        <div
          className="
            grid grid-cols-1 gap-4
            lg:grid-cols-[1fr_220px]
          "
        >
          <div className="h-64">
            {moistureByCrop.length === 0 ? (
              <div
                className="
                  flex h-full
                  items-center justify-center
                  rounded-xl
                  border border-white/50
                  bg-white/25
                  text-sm text-[#8a9a87]
                  backdrop-blur-xl
                "
              >
                No moisture readings yet.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={moistureByCrop}
                  margin={{
                    top: 15,
                    right: 15,
                    bottom: 5,
                    left: -15,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="moistureFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#1f7a3d"
                        stopOpacity={0.18}
                      />

                      <stop
                        offset="100%"
                        stopColor="#1f7a3d"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#eef3ec"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: "#8a9a87",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                    tick={{
                      fontSize: 11,
                      fill: "#8a9a87",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value ?? 0}%`,
                      "Moisture",
                    ]}
                    contentStyle={{
                      borderRadius: 10,
                      borderColor: "#e3ebe0",
                      fontSize: 12,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="moisture"
                    stroke="#1f7a3d"
                    strokeWidth={2.5}
                    dot={{
                      r: 4,
                      fill: "#1f7a3d",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* =================================================
              STATS
              ================================================= */}

          <div className="flex flex-col gap-3">
            <div
              className="
                rounded-xl
                border border-white/65
                bg-white/35
                p-4 text-center
                backdrop-blur-xl
              "
            >
              <p className="text-xs text-[#8a9a87]">
                Farm average
              </p>

              <p
                className="
                  mt-1 flex items-center
                  justify-center gap-1.5
                  text-2xl font-semibold
                  text-[#16321f]
                "
              >
                <Droplets className="h-5 w-5 text-[#5b9bd5]" />

                {crops.length
                  ? `${avgMoisture}%`
                  : "--"}
              </p>

              <p className="mt-1 text-[10px] text-[#8a9a87]">
                Across registered crops
              </p>
            </div>

            <button
              onClick={() =>
                navigate(
                  "/farmer-dashboard/geotagged",
                )
              }
              className="
                flex items-center
                justify-between
                rounded-xl
                border border-white/65
                bg-white/35
                p-4
                text-left
                backdrop-blur-xl
                transition-none
                hover:bg-white/50
              "
            >
              <div>
                <p className="text-xs text-[#8a9a87]">
                  Geo verified crops
                </p>

                <p
                  className="
                    mt-1 text-2xl
                    font-semibold
                    text-[#16321f]
                  "
                >
                  {geoTagged} / {crops.length || 0}
                </p>
              </div>

              <ArrowRight className="h-4 w-4 text-[#8a9a87]" />
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          MARKET OPPORTUNITY
          ===================================================== */}

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
        <div
          className="
            mb-4 flex items-start
            justify-between gap-3
          "
        >
          <div>
            <h2
              className="
                flex items-center gap-2
                text-[15px] font-semibold
                text-[#16321f]
              "
            >
              <TrendingUp className="h-4 w-4 text-[#1f7a3d]" />
              Market Opportunity
            </h2>

            <p className="mt-0.5 text-xs text-[#8a9a87]">
              Crops with high suitability and market
              demand for your farm.
            </p>
          </div>

          <button
            onClick={() =>
              navigate(
                "/farmer-dashboard/recommendations",
              )
            }
            className="
              flex shrink-0
              items-center gap-1
              text-xs font-medium
              text-[#1f7a3d]
              hover:underline
            "
          >
            View recommendations
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div
          className="
            relative h-72
            overflow-hidden rounded-xl
            border border-white/45
            bg-white/25
            backdrop-blur-xl
          "
        >
          {/* HIGH OPPORTUNITY ZONE */}

          <div
            className="
              pointer-events-none
              absolute right-4 top-4
              h-[78%] w-[43%]
              rounded-xl
              bg-[#eaf4e7]/45
            "
          />

          <div
            className="
              pointer-events-none
              absolute right-5 top-5
              text-[10px] font-medium
              text-[#5c9b69]
            "
          >
            High opportunity
          </div>

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <ScatterChart
              margin={{
                top: 20,
                right: 30,
                bottom: 10,
                left: 0,
              }}
            >
              <CartesianGrid stroke="#eef3ec" />

              <XAxis
                type="number"
                dataKey="demand"
                name="Market demand"
                domain={[0, 100]}
                tick={{
                  fontSize: 11,
                  fill: "#8a9a87",
                }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Market demand",
                  position: "insideBottom",
                  offset: -5,
                  fontSize: 11,
                  fill: "#8a9a87",
                }}
              />

              <YAxis
                type="number"
                dataKey="suitability"
                name="Farm suitability"
                domain={[0, 100]}
                tick={{
                  fontSize: 11,
                  fill: "#8a9a87",
                }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Farm suitability",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                  fill: "#8a9a87",
                }}
              />

              <ZAxis range={[170, 170]} />

              <Tooltip
                cursor={{
                  strokeDasharray: "3 3",
                }}
                content={({
                  active,
                  payload,
                }) => {
                  if (
                    !active ||
                    !payload?.length
                  ) {
                    return null;
                  }

                  const data =
                    payload[0]
                      .payload as
                      (typeof marketData)[number];

                  return (
                    <div
                      className="
                        rounded-lg
                        border border-white/70
                        bg-white/70
                        px-3 py-2
                        text-xs
                        shadow-lg
                        backdrop-blur-xl
                      "
                    >
                      <p className="font-medium text-[#16321f]">
                        {data.cropName}
                      </p>

                      <p className="text-[#5c6b58]">
                        {data.suitability}%
                        suitability ·{" "}
                        {data.demandLabel} demand
                      </p>
                    </div>
                  );
                }}
              />

              <Scatter
                data={marketData}
                fill="#1f7a3d"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* =====================================================
          BUSINESS ACTIVITY
          ===================================================== */}

      <section>
        <div className="mb-3 px-1">
          <p
            className="
              text-[10px] font-semibold
              uppercase tracking-[0.18em]
              text-[#8a9a87]
            "
          >
            Business
          </p>

          <h2
            className="
              mt-1 text-base
              font-semibold text-[#16321f]
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