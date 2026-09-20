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
  RefreshCw,
  Sprout,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { useFarm } from "../farmer/FarmContext";

const API_BASE = "https://ayurherb-backend-7yw4.onrender.com";

const REQUEST_TIMEOUT_MS = 45000;
const MAX_ATTEMPTS = 3;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TOP_CROPS_CACHE_KEY = "ayurherb:market:top-crops";
const RATE_CACHE_PREFIX = "ayurherb:market:history:";

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
  stale?: boolean;
}

interface FarmCrop {
  key: string;
  name: string;
}

interface TopCropsResponse {
  data?: Array<{
    cropName?: string;
    min?: number;
    max?: number;
    modal?: number;
  }>;
}

interface HistoryResponse {
  unavailable?: boolean;
  data?: {
    unit?: string;
    history?: PricePoint[];
    todayPrice?: number | null;
    changeFromYesterday?: number;
    estimated?: boolean;
  };
}

interface CacheEntry<T> {
  savedAt: number;
  value: T;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.savedAt > CACHE_MAX_AGE_MS) return null;
    return entry.value;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    const entry: CacheEntry<T> = { savedAt: Date.now(), value };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    return;
  }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function getWithRetry<T>(
  url: string,
  signal: AbortSignal,
  params?: Record<string, unknown>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await axios.get<T>(url, {
        params,
        signal,
        timeout: REQUEST_TIMEOUT_MS,
      });
      return res.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      lastError = error;

      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status !== undefined && status < 500) throw error;

      if (attempt < MAX_ATTEMPTS - 1) {
        await wait(1500 * (attempt + 1), signal);
      }
    }
  }

  throw lastError;
}

function normalizeTopCrops(payload: TopCropsResponse | undefined): TopCropEntry[] {
  const list = payload?.data;
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => ({
      cropName: String(item.cropName ?? "").trim(),
      min: Number(item.min),
      max: Number(item.max),
      modal: Number(item.modal),
    }))
    .filter(
      (item) =>
        item.cropName &&
        Number.isFinite(item.min) &&
        Number.isFinite(item.max) &&
        Number.isFinite(item.modal),
    )
    .map((item) => ({ ...item, range: Math.max(item.max - item.min, 0) }));
}

function normalizeRate(name: string, payload: HistoryResponse | undefined): CropRate {
  const data = payload?.data;
  const todayPrice =
    data?.todayPrice === null || data?.todayPrice === undefined
      ? null
      : Number(data.todayPrice);
  const unavailable =
    payload?.unavailable === true ||
    !data ||
    todayPrice === null ||
    !Number.isFinite(todayPrice);

  return {
    cropName: name,
    unit: data?.unit ?? "kg",
    history: Array.isArray(data?.history) ? data.history : [],
    todayPrice: unavailable ? null : todayPrice,
    changeFromYesterday: Number(data?.changeFromYesterday ?? 0) || 0,
    estimated: data?.estimated === true,
    unavailable,
  };
}

function unavailableRate(name: string): CropRate {
  return {
    cropName: name,
    unit: "kg",
    history: [],
    todayPrice: null,
    changeFromYesterday: 0,
    unavailable: true,
  };
}

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #dce8dc",
  borderRadius: "12px",
  color: "#26382b",
  boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  fontSize: "12px",
};

export default function DashboardInsight() {
  const { crops } = useFarm();
  const navigate = useNavigate();

  const [topCrops, setTopCrops] = useState<TopCropEntry[]>(
    () => readCache<TopCropEntry[]>(TOP_CROPS_CACHE_KEY) ?? [],
  );
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState(false);
  const [topRefresh, setTopRefresh] = useState(0);

  const [rateByKey, setRateByKey] = useState<Record<string, CropRate>>({});
  const [rateRefresh, setRateRefresh] = useState(0);

  const moistureData = useMemo(
    () =>
      crops.map((crop) => {
        const rule = getSoilRule(crop.cropName);
        const hasReading = typeof crop.moisture === "number";
        const moisture = hasReading ? (crop.moisture as number) : rule.ideal;

        return {
          cropName: crop.cropName.trim(),
          moisture,
          min: rule.min,
          max: rule.max,
          hasReading,
          inRange: hasReading ? moisture >= rule.min && moisture <= rule.max : true,
        };
      }),
    [crops],
  );

  const readings = useMemo(
    () => moistureData.filter((item) => item.hasReading),
    [moistureData],
  );

  const averageMoisture = useMemo(() => {
    if (!readings.length) return null;
    return Math.round(
      readings.reduce((sum, item) => sum + item.moisture, 0) / readings.length,
    );
  }, [readings]);

  const hasTargetOnlyCrops = moistureData.some((item) => !item.hasReading);

  useEffect(() => {
    const controller = new AbortController();
    setTopLoading(true);
    setTopError(false);

    getWithRetry<TopCropsResponse>(
      `${API_BASE}/api/market/top-crops`,
      controller.signal,
    )
      .then((payload) => {
        const entries = normalizeTopCrops(payload);
        setTopCrops(entries);
        if (entries.length > 0) writeCache(TOP_CROPS_CACHE_KEY, entries);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTopError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTopLoading(false);
      });

    return () => controller.abort();
  }, [topRefresh]);

  const topDemandCrop = topCrops.length > 0 ? topCrops[0] : null;

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
    if (farmCrops.length === 0) {
      setRateByKey({});
      return;
    }

    const controller = new AbortController();

    const cached: Record<string, CropRate> = {};
    farmCrops.forEach(({ key }) => {
      const hit = readCache<CropRate>(RATE_CACHE_PREFIX + key);
      if (hit) cached[key] = { ...hit, stale: true };
    });
    setRateByKey(cached);

    const resolveRate = async (name: string, key: string): Promise<CropRate> => {
      try {
        const payload = await getWithRetry<HistoryResponse>(
          `${API_BASE}/api/market/history/${encodeURIComponent(name)}`,
          controller.signal,
          { days: 30 },
        );
        const rate = normalizeRate(name, payload);
        if (!rate.unavailable) {
          writeCache(RATE_CACHE_PREFIX + key, rate);
          return rate;
        }
        return cached[key] ?? rate;
      } catch {
        return cached[key] ?? unavailableRate(name);
      }
    };

    farmCrops.forEach(({ key, name }) => {
      resolveRate(name, key).then((rate) => {
        if (!controller.signal.aborted) {
          setRateByKey((prev) => ({ ...prev, [key]: rate }));
        }
      });
    });

    return () => controller.abort();
  }, [farmCropSignature, rateRefresh]);

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
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf7ee] text-[#3e9460]">
                <Flame size={14} strokeWidth={1.8} />
              </div>
              <p className="text-xs font-semibold text-[#26382b]">
                High-demand crops
              </p>
            </div>

            <div className="flex items-center gap-2">
              {topCrops.length > 0 && topLoading && (
                <span className="text-[10px] text-[#8a9889]">Updating…</span>
              )}
              {topCrops.length > 0 && !topLoading && topError && (
                <button
                  type="button"
                  onClick={() => setTopRefresh((n) => n + 1)}
                  className="flex items-center gap-1 rounded-full bg-[#fdf3e1] px-2 py-0.5 text-[10px] font-medium text-[#b07a1c] hover:bg-[#fbebcd]"
                >
                  <RefreshCw size={10} />
                  Showing saved data · Retry
                </button>
              )}
              {topDemandCrop && (
                <span className="rounded-full bg-[#edf7ee] px-2 py-0.5 text-[10px] font-semibold text-[#3e8b58]">
                  Top pick: {topDemandCrop.cropName}
                </span>
              )}
            </div>
          </div>

          {topCrops.length === 0 && topLoading && (
            <div className="flex h-[160px] flex-col items-center justify-center gap-3">
              <div className="h-24 w-full animate-pulse rounded-xl bg-[#f1f5ef]" />
              <p className="text-xs text-[#8a9889]">Fetching today's mandi prices…</p>
            </div>
          )}

          {topCrops.length === 0 && !topLoading && (
            <div className="flex h-[160px] items-center justify-center text-center">
              <div>
                <Flame size={22} className="mx-auto mb-2 text-[#b4c4b6]" />
                <p className="text-xs text-[#667467]">
                  {topError
                    ? "Market prices couldn't be loaded"
                    : "No market signals yet"}
                </p>
                {topError && (
                  <button
                    type="button"
                    onClick={() => setTopRefresh((n) => n + 1)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#dce8dc] bg-white px-3 py-1.5 text-xs font-medium text-[#28733d] transition hover:bg-[#f4faf5]"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          {topCrops.length > 0 && (
            <>
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCrops}
                    margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="marketFill" x1="0" y1="0" x2="0" y2="1">
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
                      tick={{ fill: "rgba(71,85,105,0.8)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fill: "rgba(100,116,139,0.75)", fontSize: 10 }}
                      tickFormatter={(value) => `₹${value}`}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      cursor={{ fill: "rgba(15,23,42,0.03)" }}
                      contentStyle={tooltipStyle}
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
                    <span className="text-[10px] font-medium text-[#465447]">
                      {crop.cropName}
                    </span>
                    <span className="text-[10px] text-[#8a9889]">
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
              {averageMoisture === null
                ? "No sensor readings yet"
                : `Farm average: ${averageMoisture}%`}
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
                      tick={{ fill: "rgba(71,85,105,0.8)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "rgba(100,116,139,0.75)", fontSize: 10 }}
                      tickFormatter={(value) => `${value}%`}
                      axisLine={false}
                      tickLine={false}
                    />

                    {averageMoisture !== null && (
                      <ReferenceLine
                        y={averageMoisture}
                        stroke="#8aa58d"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                    )}

                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, _name, entry) => {
                        const payload = entry?.payload as
                          | (typeof moistureData)[number]
                          | undefined;

                        if (payload && !payload.hasReading) {
                          return [
                            `${value ?? 0}% target (ideal ${payload.min}\u2013${payload.max}%)`,
                            "No sensor reading",
                          ];
                        }

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
                          fill={
                            !entry.hasReading
                              ? "#cfe6d5"
                              : entry.inRange
                                ? "url(#moistureFill)"
                                : "#e0a23a"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#66766a]">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2f9e52]" />
                  In ideal range
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#e0a23a]" />
                  Outside range
                </span>
                {hasTargetOnlyCrops && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#cfe6d5]" />
                    Ideal target, no reading yet
                  </span>
                )}
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
                      Fetching today's rate…
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
                      Rate couldn't be loaded
                    </p>
                    <button
                      type="button"
                      onClick={() => setRateRefresh((n) => n + 1)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#dce8dc] bg-white px-2.5 py-1 text-[11px] font-medium text-[#28733d] transition hover:bg-[#f4faf5]"
                    >
                      <RefreshCw size={11} />
                      Retry
                    </button>
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
                      className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
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
                      <span className="ml-1.5 rounded-full bg-[#fdf3e1] px-1.5 py-0.5 text-[10px] font-medium text-[#b07a1c]">
                        Est.
                      </span>
                    )}
                    {rate.stale && (
                      <span className="ml-1.5 rounded-full bg-[#eef1ec] px-1.5 py-0.5 text-[10px] font-medium text-[#6b7a6d]">
                        Saved
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

                  <p className="mt-1 text-[10px] text-[#a1aaa0]">Last 30 days</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}