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

const API_BASE = "https://ayurherb-backend-7yw4.onrender.com";

const RATE_REQUEST_TIMEOUT_MS = 100000;

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
  todayPrice: number | null;
  changeFromYesterday: number;
  estimated?: boolean;
  unavailable?: boolean;
}

interface FarmCrop {
  key: string;
  name: string;
}

export default function DashboardInsight() {
  const { crops } = useFarm();
  const navigate = useNavigate();

  const [topCrops, setTopCrops] = useState<TopCropEntry[]>([]);
  const [topCropsLoading, setTopCropsLoading] = useState(false);
  const [topCropsError, setTopCropsError] = useState(false);

  const [rateByKey, setRateByKey] = useState<Record<string, CropRate>>({});

  const moistureData = useMemo(
    () =>
      crops.map((crop) => {
        const rule = getSoilRule(crop.cropName);
        return {
          cropName: crop.cropName.trim(),
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

  useEffect(() => {
    let cancelled = false;
    setTopCropsLoading(true);
    setTopCropsError(false);

    axios
      .get(`${API_BASE}/api/market/top-crops`, {
        timeout: RATE_REQUEST_TIMEOUT_MS,
      })
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

  const farmCrops = useMemo<FarmCrop[]>(() => {
    const seen = new Map<string, string>();

    crops.forEach((crop) => {
      const name = crop.cropName.trim();
      const key = normalizeCropName(name);
      if (name && !seen.has(key)) {
        seen.set(key, name);
      }
    });

    return Array.from(seen, ([key, name]) => ({ key, name }));
  }, [crops]);

  const farmCropSignature = farmCrops.map((c) => c.key).join("|");

  useEffect(() => {
    setRateByKey({});

    if (farmCrops.length === 0) return;

    let cancelled = false;

    farmCrops.forEach(({ key, name }) => {
      axios
        .get(`${API_BASE}/api/market/history/${encodeURIComponent(name)}`, {
          params: { days: 30 },
          timeout: RATE_REQUEST_TIMEOUT_MS,
        })
        .then((res): CropRate => {
          const data = res.data?.data;
          const unavailable =
            res.data?.unavailable === true ||
            !data ||
            data.todayPrice === null ||
            data.todayPrice === undefined;

          return {
            cropName: name,
            unit: data?.unit ?? "kg",
            history: Array.isArray(data?.history) ? data.history : [],
            todayPrice: data?.todayPrice ?? null,
            changeFromYesterday: data?.changeFromYesterday ?? 0,
            estimated: data?.estimated === true,
            unavailable,
          };
        })
        .catch(
          (): CropRate => ({
            cropName: name,
            unit: "kg",
            history: [],
            todayPrice: null,
            changeFromYesterday: 0,
            unavailable: true,
          }),
        )
        .then((rate) => {
          if (!cancelled) {
            setRateByKey((prev) => ({ ...prev, [key]: rate }));
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [farmCropSignature]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5ece3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
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
            className="hidden shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-[#28733d] hover:underline sm:flex"
          >
            View all
            <ArrowUpRight size={13} />
          </button>
        </div>

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
                      {moistureData.map((entry, index) => (
                        <Cell
                          key={`${entry.cropName}-${index}`}
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

      <div className="rounded-2xl border border-[#e5ece3] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[#193522]">
            Today's crop rates
          </h2>
          <p className="mt-0.5 text-[11px] text-[#8b9888]">
            Daily price trend for the crops on your farm
          </p>
        </div>

        {farmCrops.length === 0 && (
          <div className="flex h-[100px] items-center justify-center text-center">
            <p className="text-xs text-[#667467]">
              Add a crop to see its daily rate
            </p>
          </div>
        )}

        {farmCrops.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {farmCrops.map(({ key, name }) => {
              const rate = rateByKey[key];

              if (!rate) {
                return (
                  <div
                    key={key}
                    className="w-[190px] shrink-0 rounded-xl border border-[#edf1eb] bg-[#fcfdfb] p-3"
                  >
                    <p className="truncate text-xs font-semibold text-[#26382b]">
                      {name}
                    </p>
                    <p className="mt-3 text-[11px] text-[#8a9889]">
                      Loading today's rate...
                    </p>
                    <div className="mt-3 h-10 w-full animate-pulse rounded-md bg-[#f1f5ef]" />
                  </div>
                );
              }

              if (rate.unavailable || rate.todayPrice === null) {
                return (
                  <div
                    key={key}
                    className="w-[190px] shrink-0 rounded-xl border border-[#edf1eb] bg-[#fcfdfb] p-3"
                  >
                    <p className="truncate text-xs font-semibold text-[#26382b]">
                      {name}
                    </p>
                    <p className="mt-3 text-[11px] text-[#667467]">
                      Rate unavailable right now
                    </p>
                    <p className="mt-6 text-[9px] text-[#a1aaa0]">
                      Try again in a moment
                    </p>
                  </div>
                );
              }

              const isUp = rate.changeFromYesterday >= 0;

              return (
                <div
                  key={key}
                  className="w-[190px] shrink-0 rounded-xl border border-[#edf1eb] bg-[#fcfdfb] p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-semibold text-[#26382b]">
                      {name}
                    </p>

                    <span
                      className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        isUp
                          ? "bg-[#edf7ee] text-[#3e8b58]"
                          : "bg-[#fdeeed] text-[#c1554a]"
                      }`}
                    >
                      {isUp ? <ArrowUp size={9} /> : <ArrowDown size={9} />}₹
                      {Math.abs(rate.changeFromYesterday)}
                    </span>
                  </div>

                  <p className="mt-1 text-base font-semibold text-[#193522]">
                    ₹{rate.todayPrice}
                    <span className="ml-1 text-[10px] font-normal text-[#8a9889]">
                      /{rate.unit}
                    </span>
                    {rate.estimated && (
                      <span className="ml-1.5 rounded-full bg-[#fdf3e1] px-1.5 py-0.5 text-[9px] font-medium text-[#b07a1c]">
                        Est.
                      </span>
                    )}
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

                  <p className="mt-1 text-[9px] text-[#a1aaa0]">Last 30 days</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}