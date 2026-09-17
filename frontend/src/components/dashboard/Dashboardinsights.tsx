import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Droplets,
  Flame,
  Sprout,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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

const normalizeCropName = (name: string) => name.trim().toLowerCase();

const getSoilRule = (cropName: string): SoilRule =>
  SOIL_RULES[normalizeCropName(cropName)] ?? DEFAULT_SOIL_RULE;

interface TopCropEntry {
  cropName: string;
  min: number;
  max: number;
  modal: number;
  range: number;
}

interface PricePoint {
  date: string;
  price: number;
}

interface CropRate {
  cropName: string;
  unit: string;
  history: PricePoint[];
  todayPrice: number;
  changeFromYesterday: number;
}

export default function DashboardInsight() {
  const { crops } = useFarm();
  const navigate = useNavigate();

  const [topCrops, setTopCrops] = useState<TopCropEntry[]>([]);
  const [topCropsLoading, setTopCropsLoading] = useState(false);
  const [topCropsError, setTopCropsError] = useState(false);

  const [cropRates, setCropRates] = useState<CropRate[]>([]);
  const [cropRatesLoading, setCropRatesLoading] = useState(false);
  const [cropRatesError, setCropRatesError] = useState(false);

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

  const averageMoisture = useMemo(() => {
    if (!moistureData.length) return 0;
    return Math.round(
      moistureData.reduce((sum, item) => sum + item.moisture, 0) /
        moistureData.length,
    );
  }, [moistureData]);

  /*
   * High-demand crops board — ranked across ALL crops the agent
   * tracks, not filtered to what this farmer currently grows.
   */
  useEffect(() => {
    let cancelled = false;
    setTopCropsLoading(true);
    setTopCropsError(false);

    axios
      .get("http://localhost:8000/api/market/top-crops")
      .then((res) => {
        if (cancelled) return;

        const list = res.data?.data;

        if (!Array.isArray(list) || list.length === 0) {
          setTopCrops([]);
          setTopCropsError(true);
          return;
        }

        setTopCrops(
          list.map((m: any) => ({
            cropName: m.cropName,
            min: m.min,
            max: m.max,
            modal: m.modal,
            range: m.max - m.min,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setTopCrops([]);
          setTopCropsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setTopCropsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const topDemandCrop = useMemo(() => {
    if (!topCrops.length) return null;
    return topCrops[0];
  }, [topCrops]);

  /*
   * Today's rates — one gold-rate-style sparkline per crop this
   * farmer actually grows, pulled from /api/market/history/:cropName.
   */
  useEffect(() => {
    if (crops.length === 0) {
      setCropRates([]);
      return;
    }

    let cancelled = false;
    setCropRatesLoading(true);
    setCropRatesError(false);

    const uniqueCropNames = Array.from(
      new Set(crops.map((c) => c.cropName)),
    );

    Promise.all(
      uniqueCropNames.map((cropName) =>
        axios
          .get(
            `http://localhost:8000/api/market/history/${encodeURIComponent(cropName)}`,
            { params: { days: 30 } },
          )
          .then((res) => {
            const data = res.data?.data;
            if (!data) return null;
            return {
              cropName: data.cropName,
              unit: data.unit,
              history: data.history,
              todayPrice: data.todayPrice,
              changeFromYesterday: data.changeFromYesterday,
            } as CropRate;
          })
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;

      const resolved = results.filter(
        (r): r is CropRate => r !== null,
      );

      setCropRates(resolved);
      setCropRatesError(uniqueCropNames.length > 0 && resolved.length === 0);
      setCropRatesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [crops]);

  return (
    <div className="space-y-6">
      {/* =====================================================
          CARD 1 — HIGH-DEMAND CROPS + CROP OVERVIEW
         ===================================================== */}
      <div className="rounded-2xl border border-[#e5ece3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#193522]">
              Crop &amp; market insight
            </h2>
            <p className="mt-0.5 text-[11px] text-[#8b9888]">
              What's fetching a strong price right now, and how your crops are doing
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

        {/* HIGH-DEMAND CROPS */}
        <div className="pb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf7ee] text-[#3e9460]">
                <Flame size={14} strokeWidth={1.8} />
              </div>
              <p className="text-xs font-semibold text-[#26382b]">
                High-demand crops
              </p>
            </div>
            {topDemandCrop && (
              <span className="rounded-full bg-[#edf7ee] px-2 py-0.5 text-[10px] font-semibold text-[#3e8b58]">
                Top pick: {topDemandCrop.cropName}
              </span>
            )}
          </div>

          {topCropsLoading && (
            <div className="flex h-[160px] items-center justify-center text-center">
              <p className="text-xs text-[#8a9889]">Loading market reference...</p>
            </div>
          )}

          {!topCropsLoading && topCrops.length === 0 && (
            <div className="flex h-[160px] items-center justify-center text-center">
              <div>
                <Flame size={22} className="mx-auto mb-2 text-[#b4c4b6]" />
                <p className="text-xs text-[#667467]">
                  {topCropsError
                    ? "Market reference is unavailable right now"
                    : "No signals yet"}
                </p>
              </div>
            </div>
          )}

          {!topCropsLoading && topCrops.length > 0 && (
            <>
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCrops}
                    margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                  >
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
                      tick={{ fill: "rgba(100,116,139,0.65)", fontSize: 9 }}
                      tickFormatter={(value) => `₹${value}`}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      cursor={{ fill: "rgba(15,23,42,0.03)" }}
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #dce8dc",
                        borderRadius: "12px",
                        color: "#26382b",
                        boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
                        fontSize: "12px",
                      }}
                      formatter={(_value, _name, entry) => {
                        const payload = entry?.payload as
                          | TopCropEntry
                          | undefined;

                        if (!payload) return ["", ""];

                        return [
                          `₹${payload.min}–₹${payload.max} (modal ₹${payload.modal})`,
                          "Market range",
                        ];
                      }}
                    />

                    <Bar
                      dataKey="min"
                      stackId="range"
                      fill="transparent"
                      isAnimationActive={false}
                    />

                    <Bar
                      dataKey="range"
                      stackId="range"
                      radius={[8, 8, 8, 8]}
                      maxBarSize={40}
                    >
                      {topCrops.map((entry) => (
                        <Cell key={entry.cropName} fill="url(#marketFill)" />
                      ))}
                    </Bar>

                    <defs>
                      <linearGradient id="marketFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4cae6c" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2f8f4f" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {topCrops.map((crop) => (
                  <div
                    key={crop.cropName}
                    className="flex items-center gap-1.5 rounded-lg bg-[#f7faf6] px-2 py-1"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2f9e52]" />
                    <span className="text-[9px] font-medium text-[#465447]">
                      {crop.cropName}
                    </span>
                    <span className="text-[9px] text-[#8a9889]">
                      ₹{crop.modal}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-[#edf1eb]" />

        {/* CROP OVERVIEW */}
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

      {/* =====================================================
          CARD 2 — TODAY'S CROP RATES (separate card, below)
         ===================================================== */}
      <div className="rounded-2xl border border-[#e5ece3] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[#193522]">
            Today's crop rates
          </h2>
          <p className="mt-0.5 text-[11px] text-[#8b9888]">
            Daily price trend for the crops on your farm
          </p>
        </div>

        {cropRatesLoading && (
          <div className="flex h-[100px] items-center justify-center text-center">
            <p className="text-xs text-[#8a9889]">Loading today's rates...</p>
          </div>
        )}

        {!cropRatesLoading && crops.length === 0 && (
          <div className="flex h-[100px] items-center justify-center text-center">
            <p className="text-xs text-[#667467]">
              Add a crop to see its daily rate
            </p>
          </div>
        )}

        {!cropRatesLoading && crops.length > 0 && cropRates.length === 0 && (
          <div className="flex h-[100px] items-center justify-center text-center">
            <p className="text-xs text-[#667467]">
              {cropRatesError
                ? "Rate data is unavailable right now"
                : "No rate data yet"}
            </p>
          </div>
        )}

        {!cropRatesLoading && cropRates.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {cropRates.map((rate) => {
              const isUp = rate.changeFromYesterday >= 0;

              return (
                <div
                  key={rate.cropName}
                  className="w-[190px] shrink-0 rounded-xl border border-[#edf1eb] bg-[#fcfdfb] p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-semibold text-[#26382b]">
                      {rate.cropName}
                    </p>

                    <span
                      className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        isUp
                          ? "bg-[#edf7ee] text-[#3e8b58]"
                          : "bg-[#fdeeed] text-[#c1554a]"
                      }`}
                    >
                      {isUp ? (
                        <ArrowUp size={9} />
                      ) : (
                        <ArrowDown size={9} />
                      )}
                      ₹{Math.abs(rate.changeFromYesterday)}
                    </span>
                  </div>

                  <p className="mt-1 text-base font-semibold text-[#193522]">
                    ₹{rate.todayPrice}
                    <span className="ml-1 text-[10px] font-normal text-[#8a9889]">
                      /{rate.unit}
                    </span>
                  </p>

                  <div className="mt-1 h-10 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rate.history}>
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={isUp ? "#3e9460" : "#c1554a"}
                          strokeWidth={1.6}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="mt-1 text-[9px] text-[#a1aaa0]">
                    Last 30 days
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}