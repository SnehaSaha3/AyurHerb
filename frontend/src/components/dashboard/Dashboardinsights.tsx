import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  LabelList,
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
import {
  ArrowUpRight,
  Droplets,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { useFarm, type CropSummary } from "../farmer/FarmContext";

/* =========================================================
   RULE-BASED FARM INTELLIGENCE
   ========================================================= */

type SoilRule = {
  min: number;
  max: number;
  ideal: number;
};

const SOIL_RULES: Record<string, SoilRule> = {
  turmeric: {
    min: 45,
    max: 65,
    ideal: 55,
  },
  ashwagandha: {
    min: 35,
    max: 55,
    ideal: 45,
  },
  tulsi: {
    min: 40,
    max: 60,
    ideal: 50,
  },
  neem: {
    min: 30,
    max: 50,
    ideal: 40,
  },
  "aloe vera": {
    min: 25,
    max: 45,
    ideal: 35,
  },
  ginger: {
    min: 45,
    max: 65,
    ideal: 55,
  },
  brahmi: {
    min: 50,
    max: 70,
    ideal: 60,
  },
};

const DEFAULT_SOIL_RULE: SoilRule = {
  min: 40,
  max: 60,
  ideal: 50,
};

type MarketRule = {
  demand: number;
  suitability: number;
  opportunity: "High" | "Medium" | "Low";
};

const MARKET_RULES: Record<string, MarketRule> = {
  turmeric: {
    demand: 82,
    suitability: 80,
    opportunity: "High",
  },
  ashwagandha: {
    demand: 88,
    suitability: 74,
    opportunity: "High",
  },
  tulsi: {
    demand: 72,
    suitability: 69,
    opportunity: "Medium",
  },
  ginger: {
    demand: 76,
    suitability: 73,
    opportunity: "Medium",
  },
  brahmi: {
    demand: 68,
    suitability: 71,
    opportunity: "Medium",
  },
  neem: {
    demand: 61,
    suitability: 66,
    opportunity: "Medium",
  },
  "aloe vera": {
    demand: 64,
    suitability: 63,
    opportunity: "Medium",
  },
};

const normalizeCropName = (name: string) =>
  name.trim().toLowerCase();

const getSoilRule = (cropName: string): SoilRule =>
  SOIL_RULES[normalizeCropName(cropName)] ??
  DEFAULT_SOIL_RULE;

const getMarketRule = (cropName: string): MarketRule =>
  MARKET_RULES[normalizeCropName(cropName)] ?? {
    demand: 55,
    suitability: 55,
    opportunity: "Medium",
  };

/* =========================================================
   SOIL MOISTURE
   ========================================================= */

function SoilMoistureInsight({
  crops,
}: {
  crops: CropSummary[];
}) {
  const moistureData = useMemo(() => {
    return crops.map((crop) => {
      const rule = getSoilRule(crop.cropName);

      return {
        cropName: crop.cropName,
        moisture: rule.ideal,
        minimum: rule.min,
        maximum: rule.max,
      };
    });
  }, [crops]);

  const averageMoisture = useMemo(() => {
    if (!moistureData.length) return 0;

    return Math.round(
      moistureData.reduce(
        (sum, item) => sum + item.moisture,
        0
      ) / moistureData.length
    );
  }, [moistureData]);

  return (
    <section
      className="
        group relative h-full overflow-hidden
        rounded-[28px]
        border border-white/60
        bg-white/70
        p-5
        shadow-[0_18px_50px_rgba(15,23,42,0.08)]
        backdrop-blur-2xl
        transition-all duration-300
        hover:-translate-y-0.5
        hover:border-blue-200/70
        hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]
      "
    >
      {/* Ambient glow */}
      <div
        className="
          pointer-events-none absolute
          -right-16 -top-16
          h-44 w-44
          rounded-full
          bg-blue-200/30
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none absolute
          bottom-[-90px] left-[-50px]
          h-44 w-44
          rounded-full
          bg-sky-100/40
          blur-3xl
        "
      />

      {/* Header */}
      <div className="relative mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-11 w-11 items-center justify-center
              rounded-2xl
              border border-blue-100
              bg-blue-50
            "
          >
            <Droplets
              size={20}
              className="text-blue-500"
            />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400/70">
              Field Intelligence
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-800">
              Soil Moisture
            </h3>

            <p className="mt-0.5 text-xs text-slate-400">
              Crop-specific moisture estimate
            </p>
          </div>
        </div>

        <div
          className="
            rounded-full
            border border-amber-200
            bg-amber-50
            px-2.5 py-1
            text-[9px] font-bold
            tracking-[0.1em]
            text-amber-600
          "
        >
          RULE BASED
        </div>
      </div>

      {moistureData.length === 0 ? (
        <div
          className="
            relative flex min-h-[300px]
            items-center justify-center
            rounded-2xl
            border border-dashed border-slate-200
            bg-slate-50/70
          "
        >
          <div className="text-center">
            <Droplets
              size={30}
              className="mx-auto mb-3 text-slate-300"
            />

            <p className="text-sm text-slate-500">
              No crop data available
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Add a crop to generate insights
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Main chart */}
          <div
            className="
              relative overflow-hidden
              rounded-2xl
              border border-slate-100
              bg-white
              px-2 py-3
            "
          >
            <div className="relative h-[245px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={moistureData}
                  margin={{
                    top: 12,
                    right: 12,
                    left: -18,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 5"
                    stroke="rgba(15,23,42,0.06)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="cropName"
                    tick={{
                      fill: "rgba(71,85,105,0.75)",
                      fontSize: 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fill: "rgba(100,116,139,0.65)",
                      fontSize: 10,
                    }}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid rgba(191,219,254,0.9)",
                      borderRadius: "14px",
                      color: "#1e293b",
                      boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                    }}
                    formatter={(value) => [
                      `${value ?? 0}%`,
                      "Estimated moisture",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="moisture"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{
                      r: 5,
                      strokeWidth: 2,
                      stroke: "#3b82f6",
                      fill: "#ffffff",
                    }}
                    activeDot={{
                      r: 7,
                      strokeWidth: 3,
                      stroke: "#93c5fd",
                      fill: "#2563eb",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="relative mt-4 grid grid-cols-2 gap-3">
            <div
              className="
                rounded-2xl
                border border-blue-100
                bg-blue-50/70
                p-3.5
              "
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-400/80">
                Farm estimate
              </p>

              <div className="mt-1 flex items-baseline gap-1">
                <p className="text-2xl font-bold text-slate-800">
                  {averageMoisture}
                </p>

                <span className="text-xs text-blue-500">
                  %
                </span>
              </div>
            </div>

            <div
              className="
                rounded-2xl
                border border-emerald-100
                bg-emerald-50/70
                p-3.5
              "
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-500/80">
                Field status
              </p>

              <p className="mt-2 text-sm font-semibold text-emerald-600">
                Optimal
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Based on crop rules
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div
            className="
              relative mt-3
              flex items-start gap-2.5
              rounded-xl
              border border-slate-100
              bg-slate-50/70
              px-3 py-2.5
            "
          >
            <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />

            <p className="text-[10px] leading-relaxed text-slate-500">
              Estimated from crop-specific moisture
              requirements. IoT sensor readings can replace
              these rules later.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

/* =========================================================
   MARKET OPPORTUNITY
   ========================================================= */

function MarketOpportunityInsight({
  crops,
}: {
  crops: CropSummary[];
}) {
  const marketData = useMemo(() => {
    return crops.map((crop) => {
      const rule = getMarketRule(crop.cropName);

      return {
        cropName: crop.cropName,
        demand: rule.demand,
        suitability: rule.suitability,
        opportunity: rule.opportunity,
      };
    });
  }, [crops]);

  const strongestOpportunity = useMemo(() => {
    if (!marketData.length) return null;

    return [...marketData].sort(
      (a, b) =>
        b.demand +
        b.suitability -
        (a.demand + a.suitability)
    )[0];
  }, [marketData]);

  return (
    <section
      className="
        group relative h-full overflow-hidden
        rounded-[28px]
        border border-white/60
        bg-white/70
        p-5
        shadow-[0_18px_50px_rgba(15,23,42,0.08)]
        backdrop-blur-2xl
        transition-all duration-300
        hover:-translate-y-0.5
        hover:border-emerald-200/70
        hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]
      "
    >
      {/* Ambient glow */}
      <div
        className="
          pointer-events-none absolute
          -right-16 -top-16
          h-44 w-44
          rounded-full
          bg-emerald-200/30
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none absolute
          bottom-[-90px] left-[-50px]
          h-44 w-44
          rounded-full
          bg-lime-100/40
          blur-3xl
        "
      />

      {/* Header */}
      <div className="relative mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-11 w-11 items-center justify-center
              rounded-2xl
              border border-emerald-100
              bg-emerald-50
            "
          >
            <TrendingUp
              size={20}
              className="text-emerald-500"
            />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/80">
              Market Intelligence
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-800">
              Market Opportunity
            </h3>

            <p className="mt-0.5 text-xs text-slate-400">
              Demand & crop suitability
            </p>
          </div>
        </div>

        <div
          className="
            rounded-full
            border border-amber-200
            bg-amber-50
            px-2.5 py-1
            text-[9px] font-bold
            tracking-[0.1em]
            text-amber-600
          "
        >
          RULE BASED
        </div>
      </div>

      {marketData.length === 0 ? (
        <div
          className="
            relative flex min-h-[300px]
            items-center justify-center
            rounded-2xl
            border border-dashed border-slate-200
            bg-slate-50/70
          "
        >
          <div className="text-center">
            <Sprout
              size={30}
              className="mx-auto mb-3 text-slate-300"
            />

            <p className="text-sm text-slate-500">
              No market signals yet
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Add a crop to generate opportunities
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Scatter chart */}
          <div
            className="
              relative overflow-hidden
              rounded-2xl
              border border-slate-100
              bg-white
              px-2 py-3
            "
          >
            <div className="relative h-[245px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <ScatterChart
                  margin={{
                    top: 22,
                    right: 24,
                    left: -8,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 5"
                    stroke="rgba(15,23,42,0.06)"
                  />

                  <XAxis
                    type="number"
                    dataKey="suitability"
                    domain={[40, 100]}
                    tick={{
                      fill: "rgba(100,116,139,0.7)",
                      fontSize: 10,
                    }}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="number"
                    dataKey="demand"
                    domain={[40, 100]}
                    tick={{
                      fill: "rgba(100,116,139,0.7)",
                      fontSize: 10,
                    }}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                    axisLine={false}
                    tickLine={false}
                  />

                  <ZAxis
                    type="number"
                    range={[130, 130]}
                  />

                  <Tooltip
                    cursor={{
                      strokeDasharray: "4 4",
                      stroke: "rgba(15,23,42,0.15)",
                    }}
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid rgba(167,243,208,0.9)",
                      borderRadius: "14px",
                      color: "#1e293b",
                      boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                    }}
                    formatter={(value, name) => [
                      `${value ?? 0}%`,
                      name === "demand"
                        ? "Demand"
                        : "Suitability",
                    ]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.cropName ??
                      ""
                    }
                  />

                  <Scatter
                    name="Crops"
                    data={marketData}
                    fill="#10b981"
                  >
                    <LabelList
                      dataKey="cropName"
                      position="top"
                      offset={10}
                      style={{
                        fill: "#334155",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Crop signals */}
          <div className="relative mt-4 space-y-2">
            {marketData.slice(0, 3).map((crop) => (
              <div
                key={crop.cropName}
                className="
                  flex items-center justify-between
                  rounded-2xl
                  border border-slate-100
                  bg-slate-50/60
                  px-3.5 py-2.5
                  transition
                  hover:bg-slate-100/80
                "
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="
                      flex h-8 w-8 items-center
                      justify-center
                      rounded-xl
                      bg-emerald-50
                    "
                  >
                    <Sprout
                      size={14}
                      className="text-emerald-500"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-800">
                      {crop.cropName}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Demand {crop.demand}% · Suitability{" "}
                      {crop.suitability}%
                    </p>
                  </div>
                </div>

                <span
                  className={`
                    rounded-full
                    px-2 py-1
                    text-[9px]
                    font-bold
                    ${
                      crop.opportunity === "High"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                    }
                  `}
                >
                  {crop.opportunity}
                </span>
              </div>
            ))}
          </div>

          {/* Strongest opportunity */}
          {strongestOpportunity && (
            <div
              className="
                relative mt-3
                flex items-center justify-between
                rounded-2xl
                border border-emerald-100
                bg-emerald-50/70
                px-3.5 py-3
              "
            >
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-500/80">
                  Strongest signal
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-800">
                  {strongestOpportunity.cropName}
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                <ArrowUpRight
                  size={15}
                  className="text-emerald-600"
                />
              </div>
            </div>
          )}

    
        </>
      )}
    </section>
  );
}

/* =========================================================
   MAIN
   ========================================================= */

export default function DashboardInsight() {
  const { crops } = useFarm();
  const navigate = useNavigate();

  return (
    <section className="relative mt-6">
      {/* Section header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
          
          </div>

          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-800">
            Your farm at a glance
          </h2>

          <p className="mt-1 text-xs text-slate-900">
            Early insights from AyurHerb
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/farmer-dashboard/crops")
          }
          className="
            hidden items-center gap-1.5
            rounded-xl
            border border-slate-200
            bg-white/70
            px-3 py-2
            text-xs text-slate-500
            transition
            hover:border-slate-300
            hover:bg-white
            hover:text-slate-800
            sm:flex
          "
        >
          View crops
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SoilMoistureInsight crops={crops} />

        <MarketOpportunityInsight crops={crops} />
      </div>
    </section>
  );
}