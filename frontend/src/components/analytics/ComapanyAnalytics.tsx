import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  IndianRupee,
  Leaf,
  Loader2,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RangeOption = "7d" | "30d" | "90d" | "all";

interface SpendPoint {
  date: string;
  spend: number;
  orders: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface TopCrop {
  cropName: string;
  spend: number;
  quantity: number;
  orders: number;
}

interface TopFarmer {
  id: string;
  name: string;
  herb: string;
  spend: number;
  orders: number;
}

interface Blockchain {
  totalOrders: number;
  confirmedOnChain: number;
  escrowLoggedOnChain: number;
  pendingAdminReview: number;
  flaggedByFraudAgent: number;
}

interface AnalyticsData {
  summary: {
    totalSpend: number;
    totalOrders: number;
    avgOrderValue: number;
    allOrdersCount: number;
  };
  statusBreakdown: StatusCount[];
  spendOverTime: SpendPoint[];
  topCrops: TopCrop[];
  topFarmers: TopFarmer[];
  blockchain: Blockchain;
}

const STATUS_LABELS: Record<string, string> = {
  pending_verification: "Pending verification",
  verification_failed: "Verification failed",
  pending_stock_check: "Checking stock",
  insufficient_stock: "Insufficient stock",
  awaiting_payment: "Awaiting payment",
  payment_processing: "Payment processing",
  escrow_funded: "Escrow funded",
  pending_admin_review: "Pending admin review",
  admin_held: "Held by admin",
  shipment_released: "Shipment released",
  delivery_released: "Delivered",
  disputed: "Disputed",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  pending_verification: "bg-gray-300",
  verification_failed: "bg-red-400",
  pending_stock_check: "bg-gray-300",
  insufficient_stock: "bg-red-400",
  awaiting_payment: "bg-amber-400",
  payment_processing: "bg-amber-400",
  escrow_funded: "bg-violet-400",
  pending_admin_review: "bg-orange-400",
  admin_held: "bg-orange-500",
  shipment_released: "bg-violet-500",
  delivery_released: "bg-violet-600",
  disputed: "bg-red-500",
  rejected: "bg-red-400",
};

function formatCurrency(amount?: number) {
  if (typeof amount !== "number") return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatCompactCurrency(amount?: number) {
  if (typeof amount !== "number") return "₹0";

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatChartDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function CompanyAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeOption>("30d");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem("companyToken") ||
          localStorage.getItem("token");

        if (!token) {
          setError("Your session has expired. Please login again.");
          return;
        }

        const response = await axios.get(
          "http://localhost:8000/api/companies/analytics",
          {
            params: { range },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data?.success) {
          setData(response.data);
        } else {
          setError("Unable to load analytics.");
        }
      } catch (err: any) {
        console.error("Fetch company analytics error:", err);

        if (err.response?.status === 401) {
          setError("Your session has expired. Please login again.");
        } else {
          setError(
            err.response?.data?.error || "Failed to fetch analytics."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [range]);

  const maxStatusCount = useMemo(() => {
    if (!data?.statusBreakdown?.length) return 1;
    return Math.max(...data.statusBreakdown.map((s) => s.count), 1);
  }, [data]);

  const rangeButtons: { id: RangeOption; label: string }[] = [
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "90d", label: "90 days" },
    { id: "all", label: "All time" },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-white bg-white/80 shadow-[0_8px_30px_rgba(40,80,45,0.05)] backdrop-blur-xl">

      {/* HEADER */}
      <div className="border-b border-gray-100 px-5 pt-5">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <TrendingUp size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Procurement analytics
              </h2>

              <p className="mt-0.5 text-xs text-gray-400">
                Spend, suppliers and on-chain audit trail
              </p>
            </div>

          </div>

        </div>

        {/* RANGE TABS */}
        <div className="mt-5 flex gap-1 overflow-x-auto pb-0">

          {rangeButtons.map((option) => {
            const active = range === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setRange(option.id)}
                className={`whitespace-nowrap border-b-2 px-3 pb-3 text-xs font-semibold transition ${
                  active
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {option.label}
              </button>
            );
          })}

        </div>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Loading analytics...
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="px-5 py-16 text-center">
          <p className="text-sm font-medium text-red-500">{error}</p>
          <p className="mt-1 text-xs text-gray-400">
            Please refresh the page and try again.
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6 px-5 py-5">

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex items-center gap-1.5 text-violet-600">
                <IndianRupee size={13} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Total spend
                </span>
              </div>
              <p className="mt-1.5 text-lg font-bold text-gray-900">
                {formatCompactCurrency(data.summary.totalSpend)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex items-center gap-1.5 text-gray-600">
                <PackageCheck size={13} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Paid orders
                </span>
              </div>
              <p className="mt-1.5 text-lg font-bold text-gray-900">
                {data.summary.totalOrders}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex items-center gap-1.5 text-gray-600">
                <TrendingUp size={13} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Avg order
                </span>
              </div>
              <p className="mt-1.5 text-lg font-bold text-gray-900">
                {formatCompactCurrency(data.summary.avgOrderValue)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex items-center gap-1.5 text-orange-600">
                <AlertTriangle size={13} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Under review
                </span>
              </div>
              <p className="mt-1.5 text-lg font-bold text-gray-900">
                {data.blockchain.pendingAdminReview}
              </p>
            </div>

          </div>

          {/* SPEND CHART */}
          <div className="rounded-xl border border-gray-100 p-4">

            <p className="text-xs font-semibold text-gray-700">
              Spend over time
            </p>

            <div className="mt-3 h-48">
              {data.spendOverTime.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                  No completed payments yet in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.spendOverTime}>
                    <defs>
                      <linearGradient id="companySpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => formatCompactCurrency(v)}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), "Spend"]}
                      labelFormatter={(label) => formatChartDate(String(label))}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      fill="url(#companySpend)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>

          {/* STATUS + BLOCKCHAIN */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-700">
                Orders by status
              </p>

              <div className="mt-3 space-y-2.5">
                {data.statusBreakdown.map((s) => (
                  <div key={s.status}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600">
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                      <span className="font-semibold text-gray-800">{s.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-1.5 rounded-full ${STATUS_COLORS[s.status] || "bg-gray-300"}`}
                        style={{
                          width: `${Math.max((s.count / maxStatusCount) * 100, 6)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-gray-700">
                <ShieldCheck size={14} />
                <p className="text-xs font-semibold">Blockchain audit trail</p>
              </div>

              <div className="mt-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Confirmed on-chain</span>
                  <span className="font-semibold text-gray-800">
                    {data.blockchain.confirmedOnChain} / {data.blockchain.totalOrders}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Escrow logged on-chain</span>
                  <span className="font-semibold text-gray-800">
                    {data.blockchain.escrowLoggedOnChain}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Flagged by fraud agent</span>
                  <span className="font-semibold text-gray-800">
                    {data.blockchain.flaggedByFraudAgent}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Pending admin review</span>
                  <span className="font-semibold text-orange-600">
                    {data.blockchain.pendingAdminReview}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* TOP CROPS + TOP FARMERS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Leaf size={14} />
                <p className="text-xs font-semibold">Top crops purchased</p>
              </div>

              {data.topCrops.length === 0 ? (
                <p className="mt-3 text-xs text-gray-400">No paid orders yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {data.topCrops.map((crop) => (
                    <div key={crop.cropName} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-800">
                          {crop.cropName}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {crop.orders} order{crop.orders === 1 ? "" : "s"} · {crop.quantity} kg
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-violet-600">
                        {formatCompactCurrency(crop.spend)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Users size={14} />
                <p className="text-xs font-semibold">Top suppliers</p>
              </div>

              {data.topFarmers.length === 0 ? (
                <p className="mt-3 text-xs text-gray-400">No paid orders yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {data.topFarmers.map((farmer) => (
                    <div key={farmer.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-800">
                          {farmer.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {farmer.orders} order{farmer.orders === 1 ? "" : "s"}
                          {farmer.herb ? ` · ${farmer.herb}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-violet-600">
                        {formatCompactCurrency(farmer.spend)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </section>
  );
}