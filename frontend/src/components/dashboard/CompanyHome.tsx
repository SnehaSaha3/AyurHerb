import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Package,
  Sprout,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Farmer {
  _id: string;
  name: string;
  address?: string;
}

interface Invoice {
  invoiceNumber: string;
  qrToken: string;
}

interface Escrow {
  escrowChainTxHash?: string;
}

interface Tranche {
  type: "shipment" | "delivery";
  percent: number;
  amount: number;
  status: "pending" | "released";
  chainTxHash?: string;
}

interface Order {
  _id: string;
  cropId: string;
  cropName: string;
  quantity: number;
  amount: number;
  status: string;

  fees?: {
    grandTotal?: number;
  };

  farmerId: Farmer;

  verification?: {
    passed: boolean;
    reason?: string;
  };

  stockCheck?: {
    passed: boolean;
    reason?: string;
  };

  escrow?: Escrow;
  invoice?: Invoice;
  tranches?: Tranche[];
}

interface Stats {
  activeOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalSpend: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CompanyHome() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({
    activeOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    totalSpend: 0,
  });

  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const fetchOrders = async () => {
    const token = localStorage.getItem("companyToken");

    if (!token) {
      setMessage("Please log in as a company.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(
        "http://localhost:8000/api/orders/company",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setOrders(res.data.orders || []);

        setStats(
          res.data.stats || {
            activeOrders: 0,
            pendingOrders: 0,
            deliveredOrders: 0,
            totalSpend: 0,
          }
        );
      }
    } catch (error) {
      console.error("Failed to fetch company orders:", error);
      setMessage("Unable to load company overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /*
   * Load Razorpay checkout.
   */
  useEffect(() => {
    const scriptId = "razorpay-checkout-script";

    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");

    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);
  }, []);

  /*
   * Orders waiting for company payment.
   */
  const paymentOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status === "awaiting_payment"
      ),
    [orders]
  );

  /*
   * Crop demand calculated from REAL orders.
   */
  const cropDemand = useMemo(() => {
    const demand: Record<string, number> = {};

    orders.forEach((order) => {
      demand[order.cropName] =
        (demand[order.cropName] || 0) + order.quantity;
    });

    return Object.entries(demand)
      .map(([crop, quantity]) => ({
        crop,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  const mostOrderedCrop = cropDemand[0];

  const totalQuantity = useMemo(
    () =>
      orders.reduce(
        (total, order) => total + Number(order.quantity || 0),
        0
      ),
    [orders]
  );

  const activeSuppliers = useMemo(() => {
    return new Set(
      orders
        .map((order) => order.farmerId?._id)
        .filter(Boolean)
    ).size;
  }, [orders]);

  const startPayment = async (order: Order) => {
    const token = localStorage.getItem("companyToken");

    if (!token) {
      alert("Please log in again.");
      return;
    }

    try {
      setPayingOrderId(order._id);
      setMessage("");

      const createRes = await axios.post(
        `http://localhost:8000/api/orders/${order._id}/create-payment`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = createRes.data;

      if (!data.success) {
        throw new Error(
          data.error || "Unable to create payment request"
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is still loading. Please try again."
        );
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amountPaise,
        currency: data.currency || "INR",
        name: "AyurHerb",
        description: `Payment for ${order.cropName}`,
        order_id: data.razorpayOrderId,

        handler: async function (response: any) {
          try {
            const verifyRes = await axios.post(
              `http://localhost:8000/api/orders/${order._id}/verify-payment`,
              {
                razorpayPaymentId:
                  response.razorpay_payment_id,

                razorpaySignature:
                  response.razorpay_signature,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (!verifyRes.data.success) {
              throw new Error(
                verifyRes.data.error ||
                  "Payment verification failed"
              );
            }

            setMessage(
              "Payment verified. Escrow funded and invoice generated."
            );

            await fetchOrders();
          } catch (error: any) {
            console.error("Payment verification error:", error);

            alert(
              error.response?.data?.error ||
                error.message ||
                "Payment verification failed"
            );
          } finally {
            setPayingOrderId(null);
          }
        },

        modal: {
          ondismiss: () => {
            setPayingOrderId(null);
          },
        },

        theme: {
          color: "#16a34a",
        },
      });

      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);

      alert(
        error.response?.data?.error ||
          error.message ||
          "Unable to start payment"
      );

      setPayingOrderId(null);
    }
  };

  const openInvoice = (order: Order) => {
    if (!order.invoice?.qrToken) {
      alert("Invoice has not been generated yet.");
      return;
    }

    const url =
      `http://localhost:8000/api/public/verify/` +
      `${order._id}/` +
      `${order.invoice.qrToken}/pdf`;

    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-gray-500">
          Loading company overview...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* HEADER */}

      <div className="rounded-3xl bg-gradient-to-r from-[#183c29] via-[#24613c] to-[#4d8b52] p-7 text-white shadow-sm">

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/60">
              Company overview
            </p>

            <h1 className="mt-2 text-2xl font-semibold">
              Procurement at a glance
            </h1>

            <p className="mt-2 max-w-xl text-sm text-white/70">
              Monitor your agricultural supply network,
              payments and procurement performance.
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/company-dashboard/orders")
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#205332] transition hover:bg-white/90"
          >
            View Orders
            <ArrowRight size={15} />
          </button>

        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* STATS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Active Orders"
          value={stats.activeOrders}
          icon={<Package size={19} />}
          tone="green"
        />

        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={<Clock3 size={19} />}
          tone="amber"
        />

        <StatCard
          title="Delivered"
          value={stats.deliveredOrders}
          icon={<CheckCircle2 size={19} />}
          tone="purple"
        />

        <StatCard
          title="Total Spend"
          value={`₹${stats.totalSpend.toLocaleString("en-IN")}`}
          icon={<WalletCards size={19} />}
          tone="blue"
        />

      </div>

      {/* PAYMENT AREA */}

      <section>

        <div className="mb-4 flex items-end justify-between">

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-800">
                Payment Required
              </h2>

              {paymentOrders.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {paymentOrders.length}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Orders approved by verification and stock agents.
            </p>
          </div>

          {paymentOrders.length > 0 && (
            <button
              onClick={() =>
                navigate("/company-dashboard/orders")
              }
              className="text-xs font-medium text-green-700 hover:text-green-900"
            >
              Manage payments →
            </button>
          )}

        </div>

        {paymentOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">

            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 size={21} />
            </div>

            <p className="mt-3 text-sm font-medium text-gray-700">
              No payments requiring action
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Agent-approved orders will appear here.
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

            {paymentOrders.slice(0, 4).map((order) => {

              const payable =
                order.fees?.grandTotal ||
                order.amount ||
                0;

              return (
                <motion.div
                  key={order._id}
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
                >

                  <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-amber-50" />

                  <div className="relative p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                          <Sprout size={21} />
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {order.cropName}
                          </h3>

                          <p className="text-xs text-gray-500">
                            {order.farmerId?.name ||
                              "Unknown farmer"}
                          </p>
                        </div>

                      </div>

                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                        PAYMENT REQUIRED
                      </span>

                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">
                          Quantity
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-700">
                          {order.quantity} kg
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">
                          Amount
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-700">
                          ₹{Number(payable).toLocaleString("en-IN")}
                        </p>
                      </div>

                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">

                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700">
                        <CheckCircle2 size={11} />
                        Company verified
                      </span>

                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700">
                        <CheckCircle2 size={11} />
                        Stock verified
                      </span>

                    </div>

                    <button
                      onClick={() => startPayment(order)}
                      disabled={payingOrderId === order._id}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a3f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#176332] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <WalletCards size={16} />

                      {payingOrderId === order._id
                        ? "Opening payment..."
                        : `Pay ₹${Number(payable).toLocaleString("en-IN")}`}
                    </button>

                  </div>
                </motion.div>
              );
            })}

          </div>
        )}

      </section>

      {/* BUSINESS SNAPSHOT */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        <div className="rounded-2xl border bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <TrendingUp size={19} />
            </div>

            <div>
              <p className="text-xs text-gray-400">
                Most ordered crop
              </p>

              <p className="mt-0.5 font-semibold text-gray-800">
                {mostOrderedCrop?.crop || "No data yet"}
              </p>
            </div>

          </div>

          <div className="mt-5">
            <p className="text-2xl font-semibold text-gray-800">
              {mostOrderedCrop
                ? `${mostOrderedCrop.quantity.toLocaleString("en-IN")} kg`
                : "—"}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Total ordered quantity
            </p>
          </div>

        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">

          <p className="text-xs text-gray-400">
            Procurement volume
          </p>

          <p className="mt-2 text-2xl font-semibold text-gray-800">
            {totalQuantity.toLocaleString("en-IN")} kg
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-[72%] rounded-full bg-green-500" />
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Across {orders.length} orders
          </p>

        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">

          <p className="text-xs text-gray-400">
            Supplier network
          </p>

          <p className="mt-2 text-2xl font-semibold text-gray-800">
            {activeSuppliers}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Farmers involved in procurement
          </p>

          <button
            onClick={() =>
              navigate("/company-dashboard/explore")
            }
            className="mt-4 text-xs font-medium text-green-700 hover:text-green-900"
          >
            Explore farm network →
          </button>

        </div>

      </div>

      {/* CROP DEMAND */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">

        <div className="flex items-center justify-between">

          <div>
            <h2 className="font-semibold text-gray-800">
              Procurement by Crop
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Crops ordered by your company, based on actual order data.
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/company-dashboard/analytics")
            }
            className="text-xs font-medium text-green-700 hover:text-green-900"
          >
            Detailed analytics →
          </button>

        </div>

        {cropDemand.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            Order data will appear here.
          </div>
        ) : (
          <div className="mt-6 space-y-4">

            {cropDemand.slice(0, 5).map((item, index) => {

              const max =
                cropDemand[0]?.quantity || 1;

              const percentage =
                (item.quantity / max) * 100;

              return (
                <div key={item.crop}>

                  <div className="mb-1.5 flex justify-between">

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        #{index + 1}
                      </span>

                      <span className="text-sm font-medium text-gray-700">
                        {item.crop}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-gray-600">
                      {item.quantity.toLocaleString("en-IN")} kg
                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">

                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${percentage}%`,
                      }}
                      transition={{
                        duration: 0.6,
                        delay: index * 0.08,
                      }}
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                    />

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </section>

      {/* RECENT ACTIVITY */}

      <section className="rounded-2xl border bg-white shadow-sm">

        <div className="border-b px-6 py-5">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-gray-800">
                Recent Procurement Activity
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Latest activity across your orders.
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/company-dashboard/orders")
              }
              className="text-xs font-medium text-green-700 hover:text-green-900"
            >
              View all →
            </button>

          </div>

        </div>

        <div className="divide-y">

          {orders.slice(0, 5).map((order) => {

            const amount =
              order.fees?.grandTotal ||
              order.amount ||
              0;

            return (
              <div
                key={order._id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <Sprout size={17} />
                  </div>

                  <div>

                    <p className="text-sm font-medium text-gray-700">
                      {order.cropName}
                    </p>

                    <p className="text-xs text-gray-400">
                      {order.quantity} kg ·{" "}
                      {order.farmerId?.name ||
                        "Unknown farmer"}
                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-4">

                  <span className="text-sm font-semibold text-gray-700">
                    ₹{Number(amount).toLocaleString("en-IN")}
                  </span>

                  {order.status === "awaiting_payment" ? (
                    <button
                      onClick={() => startPayment(order)}
                      disabled={payingOrderId === order._id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Pay
                    </button>
                  ) : order.invoice ? (
                    <button
                      onClick={() => openInvoice(order)}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      Invoice
                    </button>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-500">
                      {order.status.replaceAll("_", " ")}
                    </span>
                  )}

                </div>

              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              No procurement activity yet.
            </div>
          )}

        </div>

      </section>

    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "green" | "amber" | "purple" | "blue";
}) {
  const tones = {
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-2xl border bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">

        <p className="text-xs font-medium text-gray-400">
          {title}
        </p>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          {icon}
        </div>

      </div>

      <p className="mt-4 text-2xl font-semibold text-gray-800">
        {value}
      </p>

    </motion.div>
  );
}