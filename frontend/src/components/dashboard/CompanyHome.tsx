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
  invoicePdfBase64?: string;
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
  const [payingOrderId, setPayingOrderId] =
    useState<string | null>(null);
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

  /* =========================================================
     RAZORPAY
  ========================================================== */

  useEffect(() => {
    const scriptId = "razorpay-checkout-script";

    if (document.getElementById(scriptId)) {
      return;
    }

    const script = document.createElement("script");

    script.id = scriptId;
    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);
  }, []);

  /* =========================================================
     DERIVED DATA
  ========================================================== */

  const paymentOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status === "awaiting_payment"
      ),
    [orders]
  );

  const cropDemand = useMemo(() => {
    const demand: Record<string, number> = {};

    orders.forEach((order) => {
      demand[order.cropName] =
        (demand[order.cropName] || 0) +
        Number(order.quantity || 0);
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
        (total, order) =>
          total + Number(order.quantity || 0),
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

  /* =========================================================
     PAYMENT
  ========================================================== */

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
            console.error(
              "Payment verification error:",
              error
            );

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
          color: "#1f7a3f",
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

  /* =========================================================
     INVOICE
  ========================================================== */

  const openInvoice = (order: Order) => {
  const base64 = order.invoice?.invoicePdfBase64;

  if (!base64) {
    alert("Invoice has not been generated yet.");
    return;
  }

  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);

  const blob = new Blob([byteArray], {
    type: "application/pdf",
  });

  const url = URL.createObjectURL(blob);

  window.open(url, "_blank");

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
};

  /* =========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#dce3dc] border-t-[#2b7442]" />

          <p className="text-xs text-[#8a928c]">
            Loading company overview...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1380px]">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <section className="mb-6 flex flex-col gap-4 border-b border-[#e5e8e4] pb-6 sm:mb-7 sm:pb-7 lg:flex-row lg:items-end lg:justify-between">

        <div className="min-w-0">

          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-[#303630] sm:text-2xl lg:text-[26px]">
            Procurement at a glance
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#858d87] sm:text-sm sm:leading-6">
            Monitor your agricultural supply network,
            payments and procurement activity from one
            workspace.
          </p>
        </div>

        <button
          onClick={() =>
            navigate("/company-dashboard/orders")
          }
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dfe4df] bg-white px-4 py-2.5 text-xs font-medium text-[#3e4740] shadow-sm transition hover:border-[#cbd3cc] hover:bg-[#f8f9f7] sm:w-auto sm:text-sm"
        >
          View Orders
          <ArrowRight size={15} />
        </button>

      </section>

      {/* =====================================================
          MESSAGE
      ====================================================== */}

      {message && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700 sm:text-sm">
          {message}
        </div>
      )}

      {/* =====================================================
          OVERVIEW STATS
      ====================================================== */}

      <section className="mb-7 overflow-hidden rounded-2xl border border-[#e4e8e3] bg-white shadow-sm">

        <div className="grid grid-cols-2 divide-x divide-y divide-[#edf0ec] lg:grid-cols-4 lg:divide-y-0">

          <OverviewStat
            title="Active Orders"
            value={stats.activeOrders}
            icon={<Package size={17} />}
            tone="green"
          />

          <OverviewStat
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={<Clock3 size={17} />}
            tone="amber"
          />

          <OverviewStat
            title="Delivered"
            value={stats.deliveredOrders}
            icon={<CheckCircle2 size={17} />}
            tone="purple"
          />

          <OverviewStat
            title="Total Spend"
            value={`₹${Number(
              stats.totalSpend || 0
            ).toLocaleString("en-IN")}`}
            icon={<WalletCards size={17} />}
            tone="blue"
          />

        </div>

      </section>

      {/* =====================================================
          PAYMENT REQUIRED
      ====================================================== */}

      <section className="mb-7">

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#343a35] sm:text-lg">
                Payment Required
              </h2>

              {paymentOrders.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                  {paymentOrders.length}
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-[#929a94] sm:text-xs">
              Orders approved by verification and stock
              agents.
            </p>
          </div>

          {paymentOrders.length > 0 && (
            <button
              onClick={() =>
                navigate("/company-dashboard/orders")
              }
              className="self-start text-[11px] font-medium text-green-700 hover:text-green-900 sm:text-xs"
            >
              Manage payments →
            </button>
          )}

        </div>

        {paymentOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8ddd8] bg-white px-5 py-10 text-center">

            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 size={20} />
            </div>

            <p className="mt-3 text-xs font-medium text-[#59605b] sm:text-sm">
              No payments requiring action
            </p>

            <p className="mt-1 text-[10px] text-[#a1a7a2] sm:text-xs">
              Agent-approved orders will appear here.
            </p>

          </div>
        ) : (
          <div className="space-y-3">

            {paymentOrders.slice(0, 4).map((order) => {
              const payable =
                order.fees?.grandTotal ||
                order.amount ||
                0;

              return (
                <motion.div
                  key={order._id}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-2xl border border-amber-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                        <Sprout size={19} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-[#3c423e]">
                            {order.cropName}
                          </h3>

                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[8px] font-semibold text-amber-700">
                            PAYMENT REQUIRED
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[11px] text-[#8b928d]">
                          {order.farmerId?.name ||
                            "Unknown farmer"}
                        </p>
                      </div>

                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">

                      <div className="rounded-xl bg-[#f7f8f6] px-4 py-2.5 lg:min-w-[110px]">
                        <p className="text-[9px] uppercase tracking-wide text-[#a0a6a1]">
                          Quantity
                        </p>

                        <p className="mt-0.5 text-xs font-semibold text-[#59605b]">
                          {order.quantity} kg
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f7f8f6] px-4 py-2.5 lg:min-w-[130px]">
                        <p className="text-[9px] uppercase tracking-wide text-[#a0a6a1]">
                          Amount
                        </p>

                        <p className="mt-0.5 text-xs font-semibold text-[#59605b]">
                          ₹
                          {Number(payable).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>

                      <button
                        onClick={() => startPayment(order)}
                        disabled={
                          payingOrderId === order._id
                        }
                        className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#1f7a3f] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#176332] disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-1 lg:min-w-[145px]"
                      >
                        <WalletCards size={14} />

                        {payingOrderId === order._id
                          ? "Opening payment..."
                          : `Pay ₹${Number(
                              payable
                            ).toLocaleString("en-IN")}`}
                      </button>

                    </div>

                  </div>

                  <div className="flex flex-wrap gap-1.5 border-t border-[#f0eee8] px-4 py-3 sm:px-5">
                    <VerificationBadge>
                      Company verified
                    </VerificationBadge>

                    <VerificationBadge>
                      Stock verified
                    </VerificationBadge>
                  </div>

                </motion.div>
              );
            })}

          </div>
        )}

      </section>

      {/* =====================================================
          PROCUREMENT OVERVIEW
      ====================================================== */}

      <section className="mb-7 rounded-2xl border border-[#e4e8e3] bg-white shadow-sm">

        <div className="border-b border-[#edf0ec] px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#3b413d] sm:text-base">
                Procurement Overview
              </h2>

              <p className="mt-1 text-[10px] text-[#929a94] sm:text-xs">
                A summary of your purchasing activity.
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/company-dashboard/explore")
              }
              className="self-start text-[10px] font-medium text-green-700 hover:text-green-900 sm:text-xs"
            >
              Explore farm network →
            </button>
          </div>

        </div>

        <div className="grid grid-cols-1 divide-y divide-[#edf0ec] md:grid-cols-3 md:divide-x md:divide-y-0">

          {/* Most ordered */}

          <div className="p-5 sm:p-6">

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <TrendingUp size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] text-[#9aa19b]">
                  Most ordered crop
                </p>

                <p className="mt-0.5 truncate text-sm font-semibold text-[#3b413d]">
                  {mostOrderedCrop?.crop ||
                    "No data yet"}
                </p>
              </div>
            </div>

            <p className="mt-5 text-xl font-semibold tracking-tight text-[#343a35] sm:text-2xl">
              {mostOrderedCrop
                ? `${mostOrderedCrop.quantity.toLocaleString(
                    "en-IN"
                  )} kg`
                : "—"}
            </p>

            <p className="mt-1 text-[10px] text-[#9aa19b]">
              Ordered quantity
            </p>

          </div>

          {/* Procurement volume */}

          <div className="p-5 sm:p-6">

            <p className="text-[10px] text-[#9aa19b]">
              Procurement volume
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight text-[#343a35] sm:text-2xl">
              {totalQuantity.toLocaleString("en-IN")} kg
            </p>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#edf0ec]">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: totalQuantity > 0 ? "100%" : "0%",
                }}
                transition={{ duration: 0.7 }}
                className="h-full rounded-full bg-[#4d8b52]"
              />
            </div>

            <p className="mt-2 text-[10px] text-[#9aa19b]">
              Across {orders.length} orders
            </p>

          </div>

          {/* Supplier network */}

          <div className="p-5 sm:p-6">

            <p className="text-[10px] text-[#9aa19b]">
              Supplier network
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight text-[#343a35] sm:text-2xl">
              {activeSuppliers}
            </p>

            <p className="mt-1 text-[10px] text-[#9aa19b]">
              Farmers involved in procurement
            </p>

          </div>

        </div>

      </section>

      {/* =====================================================
          PROCUREMENT BY CROP
      ====================================================== */}

      <section className="mb-7 rounded-2xl border border-[#e4e8e3] bg-white shadow-sm">

        <div className="border-b border-[#edf0ec] px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-sm font-semibold text-[#3b413d] sm:text-base">
                Procurement by Crop
              </h2>

              <p className="mt-1 text-[10px] text-[#929a94] sm:text-xs">
                Based on actual order data.
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/company-dashboard/analytics")
              }
              className="self-start text-[10px] font-medium text-green-700 hover:text-green-900 sm:text-xs"
            >
              Detailed analytics →
            </button>

          </div>

        </div>

        {cropDemand.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-[#a0a6a1]">
            Order data will appear here.
          </div>
        ) : (
          <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">

            {cropDemand.slice(0, 5).map((item, index) => {
              const max = cropDemand[0]?.quantity || 1;

              const percentage =
                (item.quantity / max) * 100;

              return (
                <div key={item.crop}>

                  <div className="mb-1.5 flex items-center justify-between gap-4">

                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-5 shrink-0 text-[10px] font-medium text-[#a0a6a1]">
                        #{index + 1}
                      </span>

                      <span className="truncate text-xs font-medium text-[#59605b] sm:text-sm">
                        {item.crop}
                      </span>
                    </div>

                    <span className="shrink-0 text-[10px] font-semibold text-[#737b75] sm:text-xs">
                      {item.quantity.toLocaleString("en-IN")} kg
                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#eef1ed]">

                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${percentage}%`,
                      }}
                      transition={{
                        duration: 0.6,
                        delay: index * 0.08,
                      }}
                      className="h-full rounded-full bg-[#4d8b52]"
                    />

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </section>

      {/* =====================================================
          RECENT ACTIVITY
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-[#e4e8e3] bg-white shadow-sm">

        <div className="border-b border-[#edf0ec] px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex items-center justify-between gap-3">

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[#3b413d] sm:text-base">
                Recent Procurement Activity
              </h2>

              <p className="mt-1 text-[10px] text-[#929a94] sm:text-xs">
                Latest activity across your orders.
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/company-dashboard/orders")
              }
              className="shrink-0 text-[10px] font-medium text-green-700 hover:text-green-900 sm:text-xs"
            >
              View all →
            </button>

          </div>

        </div>

        <div className="divide-y divide-[#edf0ec]">

          {orders.slice(0, 5).map((order) => {
            const amount =
              order.fees?.grandTotal ||
              order.amount ||
              0;

            return (
              <div
                key={order._id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <Sprout size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#59605b] sm:text-sm">
                      {order.cropName}
                    </p>

                    <p className="truncate text-[10px] text-[#a0a6a1] sm:text-xs">
                      {order.quantity} kg
                      {" · "}
                      {order.farmerId?.name ||
                        "Unknown farmer"}
                    </p>
                  </div>

                </div>

                <div className="flex items-center justify-between gap-3 pl-12 sm:justify-end sm:pl-0">

                  <span className="text-xs font-semibold text-[#59605b] sm:text-sm">
                    ₹
                    {Number(amount).toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  {order.status === "awaiting_payment" ? (
                    <button
                      onClick={() => startPayment(order)}
                      disabled={
                        payingOrderId === order._id
                      }
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-[10px] font-medium text-white transition hover:bg-green-700 disabled:opacity-50 sm:text-xs"
                    >
                      {payingOrderId === order._id
                        ? "..."
                        : "Pay"}
                    </button>
                  ) : order.invoice ? (
                    <button
                      onClick={() => openInvoice(order)}
                      className="rounded-lg bg-[#f1f3f0] px-3 py-1.5 text-[10px] font-medium text-[#68706a] transition hover:bg-[#e8ebe7] sm:text-xs"
                    >
                      Invoice
                    </button>
                  ) : (
                    <span className="max-w-[110px] truncate rounded-full bg-[#f1f3f0] px-2.5 py-1 text-[9px] font-medium capitalize text-[#7d857f] sm:max-w-none">
                      {order.status.replaceAll("_", " ")}
                    </span>
                  )}

                </div>

              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="px-6 py-10 text-center text-xs text-[#a0a6a1]">
              No procurement activity yet.
            </div>
          )}

        </div>

      </section>

    </div>
  );
}

/* ============================================================
   OVERVIEW STAT
============================================================ */

function OverviewStat({
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
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-[#9aa19b] sm:text-xs">
          {title}
        </p>

        <p className="mt-1 truncate text-lg font-semibold tracking-tight text-[#3b413d] sm:text-xl">
          {value}
        </p>
      </div>

    </div>
  );
}

/* ============================================================
   VERIFICATION BADGE
============================================================ */

function VerificationBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[9px] font-medium text-green-700">
      <CheckCircle2 size={10} />
      {children}
    </span>
  );
}