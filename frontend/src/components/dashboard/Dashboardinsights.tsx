import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  LabelList,
} from "recharts";
import { ArrowUpRight, Droplets, TrendingUp, Sprout } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useFarm } from "../farmer/FarmContext";

type SoilRule = { min: number; max: number; ideal: number };

const SOIL_RULES: Record<string, SoilRule> = {
  turmeric: { min: 45, max: 65, ideal: 55 },
  ashwagandha: { min: 35, max: 55, ideal: 45 },
  tulsi: { min: 40, max: 60, ideal: 50 },
  neem: { min: 30, max: 50, ideal: 40 },
  "aloe vera": { min: 25, max: 45, ideal: 35 },
  ginger: { min: 45, max: 65, ideal: 55 },
  brahmi: { min: 50, max: 70, ideal: 60 },
};

const DEFAULT_SOIL_RULE: SoilRule = { min: 40, max: 60, ideal: 50 };

type MarketRule = {
  demand: number;
  suitability: number;
  opportunity: "High" | "Medium" | "Low";
};

const MARKET_RULES: Record<string, MarketRule> = {
  turmeric: { demand: 82, suitability: 80, opportunity: "High" },
  ashwagandha: { demand: 88, suitability: 74, opportunity: "High" },
  tulsi: { demand: 72, suitability: 69, opportunity: "Medium" },
  ginger: { demand: 76, suitability: 73, opportunity: "Medium" },
  brahmi: { demand: 68, suitability: 71, opportunity: "Medium" },
  neem: { demand: 61, suitability: 66, opportunity: "Medium" },
  "aloe vera": { demand: 64, suitability: 63, opportunity: "Medium" },
};

const normalizeCropName = (name: string) => name.trim().toLowerCase();

const getSoilRule = (cropName: string): SoilRule =>
  SOIL_RULES[normalizeCropName(cropName)] ?? DEFAULT_SOIL_RULE;

const getMarketRule = (cropName: string): MarketRule =>
  MARKET_RULES[normalizeCropName(cropName)] ?? {
    demand: 55,
    suitability: 55,
    opportunity: "Medium",
  };

const OPPORTUNITY_COLOR: Record<MarketRule["opportunity"], string> = {
  High: "#2f9e52",
  Medium: "#c68a3a",
  Low: "#a3a3a3",
};

export default function DashboardInsight() {
  const { crops } = useFarm();
  const navigate = useNavigate();

  const moistureData = useMemo(
    () =>
      crops.map((crop) => {
        const rule = getSoilRule(crop.cropName);
        return {
          cropName: crop.cropName,
          moisture: rule.ideal,
          min: rule.min,
          max: rule.max,
          inRange:
            crop.moisture === undefined
              ? true
              : crop.moisture >= rule.min && crop.moisture <= rule.max,
        };
      }),
    [crops],
  );

  const marketData = useMemo(
    () =>
      crops.map((crop) => {
        const rule = getMarketRule(crop.cropName);
        return {
          cropName: crop.cropName,
          demand: rule.demand,
          suitability: rule.suitability,
          opportunity: rule.opportunity,
        };
      }),
    [crops],
  );

  const averageMoisture = useMemo(() => {
    if (!moistureData.length) return 0;
    return Math.round(
      moistureData.reduce((sum, item) => sum + item.moisture, 0) /
        moistureData.length,
    );
  }, [moistureData]);

  const strongestOpportunity = useMemo(() => {
    if (!marketData.length) return null;
    return [...marketData].sort(
      (a, b) => b.demand + b.suitability - (a.demand + a.suitability),
    )[0];
  }, [marketData]);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#193522]">
            Crop &amp; market insight
          </h2>
          <p className="mt-0.5 text-[11px] text-[#8b9888]">
            Demand signal and moisture status for your crops
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/farmer-dashboard/crops")}
          className="hidden items-center gap-1 text-xs font-medium text-[#28733d] hover:underline sm:flex"
        >
          View all
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* =====================================================
          MARKET OPPORTUNITY — full width, on top
         ===================================================== */}
      <div className="pb-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf7ee] text-[#3e9460]">
              <TrendingUp size={14} strokeWidth={1.8} />
            </div>
            <p className="text-xs font-semibold text-[#26382b]">
              Market opportunity
            </p>
          </div>
          {strongestOpportunity && (
            <span className="rounded-full bg-[#edf7ee] px-2 py-0.5 text-[10px] font-semibold text-[#3e8b58]">
              Strongest: {strongestOpportunity.cropName}
            </span>
          )}
        </div>

        {marketData.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-center">
            <div>
              <TrendingUp size={22} className="mx-auto mb-2 text-[#b4c4b6]" />
              <p className="text-xs text-[#667467]">No signals yet</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 5" stroke="rgba(15,23,42,0.06)" />

                  <XAxis
                    type="number"
                    dataKey="suitability"
                    domain={[40, 100]}
                    tick={{ fill: "rgba(100,116,139,0.65)", fontSize: 9 }}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="number"
                    dataKey="demand"
                    domain={[40, 100]}
                    tick={{ fill: "rgba(100,116,139,0.65)", fontSize: 9 }}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                  />

                  <ZAxis type="number" range={[120, 120]} />

                  <Tooltip
                    cursor={{ strokeDasharray: "4 4", stroke: "rgba(15,23,42,0.12)" }}
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #dce8dc",
                      borderRadius: "12px",
                      color: "#26382b",
                      boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
                      fontSize: "12px",
                    }}
                    formatter={(value, name) => [
                      `${value ?? 0}%`,
                      name === "demand" ? "Demand" : "Suitability",
                    ]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.cropName ?? ""
                    }
                  />

                  <Scatter name="Crops" data={marketData}>
                    {marketData.map((entry) => (
                      <Cell
                        key={entry.cropName}
                        fill={OPPORTUNITY_COLOR[entry.opportunity]}
                      />
                    ))}
                    <LabelList
                      dataKey="cropName"
                      position="top"
                      offset={6}
                      style={{ fill: "#526153", fontSize: 9, fontWeight: 600 }}
                    />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {marketData.map((crop) => (
                <div
                  key={crop.cropName}
                  className="flex items-center gap-1.5 rounded-lg bg-[#f7faf6] px-2 py-1"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: OPPORTUNITY_COLOR[crop.opportunity] }}
                  />
                  <span className="text-[9px] font-medium text-[#465447]">
                    {crop.cropName}
                  </span>
                  <span className="text-[9px] text-[#8a9889]">{crop.demand}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-[#edf1eb]" />

      {/* =====================================================
          CROP OVERVIEW — full width, below
         ===================================================== */}
      <div className="pt-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef5fb] text-[#5b9bd5]">
              <Droplets size={14} strokeWidth={1.8} />
            </div>
            <p className="text-xs font-semibold text-[#26382b]">Crop overview</p>
          </div>
          <span className="text-[11px] font-semibold text-[#193522]">
            Farm average: {averageMoisture}%
          </span>
        </div>

        {moistureData.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-center">
            <div>
              <Sprout size={22} className="mx-auto mb-2 text-[#b4c4b6]" />
              <p className="text-xs text-[#667467]">No crop data yet</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={moistureData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="moistureFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4cae6c" stopOpacity={1} />
                      <stop offset="100%" stopColor="#2f8f4f" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 5"
                    stroke="rgba(15,23,42,0.06)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="cropName"
                    tick={{ fill: "rgba(71,85,105,0.7)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "rgba(100,116,139,0.6)", fontSize: 9 }}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                  />

                  <ReferenceLine
                    y={averageMoisture}
                    stroke="#8aa58d"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #dce8dc",
                      borderRadius: "12px",
                      color: "#26382b",
                      boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
                      fontSize: "12px",
                    }}
                    formatter={(value, _name, entry) => {
                      const payload = entry?.payload as
                        | (typeof moistureData)[number]
                        | undefined;
                      return [
                        `${value ?? 0}% (ideal ${payload?.min}\u2013${payload?.max}%)`,
                        "Moisture",
                      ];
                    }}
                  />

                  <Bar dataKey="moisture" radius={[8, 8, 0, 0]} maxBarSize={40}>
                    {moistureData.map((entry) => (
                      <Cell
                        key={entry.cropName}
                        fill={entry.inRange ? "url(#moistureFill)" : "#e0a23a"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex items-center gap-4 text-[10px] text-[#66766a]">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2f9e52]" />
                In ideal range
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e0a23a]" />
                Outside range
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}