import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee,
  MapPinned,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import CropMap from "../maps/CropMap";

interface Farmer {
  _id: string;
  name: string;
  address?: string;
}

interface Invoice {
  invoiceNumber: string;
  invoiceText: string;
  generatedAt: string;
  qrToken: string;
  qrCodeDataUrl: string;
  invoicePdfBase64?: string;
}

interface Escrow {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amountPaidPaise?: number;
  currency?: string;
  fundedAt?: string;
  escrowChainTxHash?: string;
}

interface Tranche {
  type: "shipment" | "delivery";
  percent: number;
  amount: number;
  status: "pending" | "released";
  releasedAt?: string;
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

  chainTxHash?: string;
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

const STATUS_META: Record<string, { label: string; tone: string }> = {
  awaiting_payment: { label: "Payment required", tone: "bg-amber-50 text-amber-700 border-amber-100" },
  payment_processing: { label: "Processing", tone: "bg-blue-50 text-blue-700 border-blue-100" },
  escrow_funded: { label: "Escrow funded", tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  shipment_released: { label: "Shipment ready", tone: "bg-violet-50 text-violet-700 border-violet-100" },
  delivery_released: { label: "Delivered", tone: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  pending_verification: { label: "Agent review", tone: "bg-yellow-50 text-yellow-700 border-yellow-100" },
  pending_stock_check: { label: "Stock check", tone: "bg-orange-50 text-orange-700 border-orange-100" },
  insufficient_stock: { label: "Insufficient stock", tone: "bg-red-50 text-red-700 border-red-100" },
  verification_failed: { label: "Rejected", tone: "bg-red-50 text-red-700 border-red-100" },
  rejected: { label: "Rejected", tone: "bg-red-50 text-red-700 border-red-100" },
};

function getStatusMeta(status: string) {
  return STATUS_META[status] || { label: status, tone: "bg-gray-50 text-gray-600 border-gray-100" };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function CompanyHome() {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
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

  /* ---------------------------------------------------------
     LOAD RAZORPAY CHECKOUT
  --------------------------------------------------------- */

  useEffect(() => {
    const scriptId = "razorpay-checkout-script";

    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");

    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);
  }, []);

  /* ---------------------------------------------------------
     COMPANY NAME
  --------------------------------------------------------- */

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("companyToken");
        if (!token) return;

        const response = await axios.get(
          "http://localhost:8000/api/companies/me",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data?.company?.name) {
          setCompanyName(response.data.company.name);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };

    fetchCompany();
  }, []);

  /* ---------------------------------------------------------
     ORDERS
  --------------------------------------------------------- */

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
        { headers: { Authorization: `Bearer ${token}` } }
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
    } catch (err) {
      console.error("Failed to fetch company orders", err);
      setMessage("Unable to load company orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ---------------------------------------------------------
     PAYMENT FLOW
  --------------------------------------------------------- */

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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = createRes.data;

      if (!data.success) {
        throw new Error(data.error || "Unable to create payment request");
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is still loading. Please try again.");
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
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!verifyRes.data.success) {
              throw new Error(verifyRes.data.error || "Payment verification failed");
            }

            setMessage("Payment verified. Escrow funded and invoice generated.");

            await fetchOrders();
          } catch (err: any) {
            console.error("Payment verification error:", err);

            alert(
              err.response?.data?.error || err.message || "Payment verification failed"
            );
          } finally {
            setPayingOrderId(null);
          }
        },

        modal: {
          ondismiss: function () {
            setPayingOrderId(null);
          },
        },

        theme: { color: "#7c3aed" },
      });

      razorpay.open();
    } catch (err: any) {
      console.error("Payment error:", err);

      alert(err.response?.data?.error || err.message || "Unable to start payment");

      setPayingOrderId(null);
    }
  };

  /* ---------------------------------------------------------
     INVOICE
  --------------------------------------------------------- */

  const openInvoice = (order: Order) => {
    if (!order.invoice?.qrToken) {
      alert("Invoice has not been generated yet.");
      return;
    }

    const url =
      `http://localhost:8000/api/public/verify/${order._id}/${order.invoice.qrToken}/pdf`;

    window.open(url, "_blank");
  };

  const paymentRequests = orders.filter((o) => o.status === "awaiting_payment");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        Loading procurement activity...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* -----------------------------------------------------
          HERO
      ----------------------------------------------------- */}

      <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-500">
            Procurement
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
            {getGreeting()}{companyName ? `, ${companyName}` : ""}.
          </h1>

          <p className="mt-2 max-w-lg text-sm text-gray-500">
            Track orders, payments, escrow and shipments across your supplier network.
          </p>
        </div>

        <button
          onClick={() => navigate("/company-dashboard/analytics")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 sm:w-fit"
        >
          <BarChart3 size={16} />
          View analytics
          <ArrowRight size={14} />
        </button>

      </div>

      {message && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* -----------------------------------------------------
          STATS
      ----------------------------------------------------- */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {[
          { title: "Active orders", value: stats.activeOrders, icon: <Package size={16} /> },
          { title: "Pending orders", value: stats.pendingOrders, icon: <Clock size={16} /> },
          { title: "Delivered", value: stats.deliveredOrders, icon: <CheckCircle2 size={16} /> },
          {
            title: "Total spend",
            value: `₹${stats.totalSpend.toLocaleString("en-IN")}`,
            icon: <IndianRupee size={16} />,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{item.title}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                {item.icon}
              </div>
            </div>

            <p className="mt-3 text-2xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}

      </div>

      {/* -----------------------------------------------------
          PAYMENT REQUESTS
      ----------------------------------------------------- */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900">Payment requests</h2>
          <p className="mt-1 text-xs text-gray-400">
            Orders cleared by the verification and stock agents, ready for payment.
          </p>
        </div>

        <div className="divide-y divide-gray-100">

          {paymentRequests.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              No payment requests right now.
            </div>
          )}

          {paymentRequests.map((order) => (
            <div
              key={order._id}
              className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between"
            >

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">{order.cropName}</h3>

                  <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
                    Payment required
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-gray-500">
                  Farmer: {order.farmerId?.name || "Unknown farmer"}
                </p>

                <p className="text-xs text-gray-500">Quantity: {order.quantity} kg</p>

                <p className="mt-2 text-sm font-semibold text-gray-900">
                  ₹{(order.fees?.grandTotal || order.amount).toLocaleString("en-IN")}
                </p>
              </div>

              <button
                onClick={() => startPayment(order)}
                disabled={payingOrderId === order._id}
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {payingOrderId === order._id ? "Opening payment..." : "Pay now"}
              </button>

            </div>
          ))}

        </div>
      </div>

      {/* -----------------------------------------------------
          PROCUREMENT ACTIVITY
      ----------------------------------------------------- */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900">Procurement activity</h2>
          <p className="mt-1 text-xs text-gray-400">
            Live order, payment, escrow and shipment status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Crop</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Farmer</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Quantity</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Amount</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Invoice</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const status = getStatusMeta(order.status);

                return (
                  <tr key={order._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.cropName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.farmerId?.name || "Unknown"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.quantity} kg</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ₹{(order.fees?.grandTotal || order.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${status.tone}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.invoice ? (
                        <button
                          onClick={() => openInvoice(order)}
                          className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800"
                        >
                          <FileText size={13} />
                          View invoice
                        </button>
                      ) : order.status === "escrow_funded" || order.status === "shipment_released" ? (
                        <span className="text-xs text-gray-400">Generating...</span>
                      ) : (
                        <span className="text-xs text-gray-400">Not generated</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -----------------------------------------------------
          ESCROW / SHIPMENT
      ----------------------------------------------------- */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-violet-600" />
            <h3 className="text-sm font-semibold text-gray-900">Escrow activity</h3>
          </div>

          <div className="mt-4 space-y-3">
            {orders
              .filter((o) => o.escrow?.escrowChainTxHash)
              .slice(0, 5)
              .map((order) => (
                <div key={order._id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{order.cropName}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Funded
                    </span>
                  </div>

                  <p className="mt-2 break-all text-[11px] text-gray-400">
                    Tx: {order.escrow?.escrowChainTxHash}
                  </p>
                </div>
              ))}

            {orders.filter((o) => o.escrow?.escrowChainTxHash).length === 0 && (
              <p className="text-sm text-gray-400">No escrow transactions yet.</p>
            )}
          </div>

        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-2">
            <Truck size={15} className="text-violet-600" />
            <h3 className="text-sm font-semibold text-gray-900">Shipment status</h3>
          </div>

          <div className="mt-4 space-y-3">
            {orders.slice(0, 5).map((order) => {
              const shipment = order.tranches?.find((t) => t.type === "shipment");

              return (
                <div key={order._id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{order.cropName}</span>
                    <span className="text-xs text-gray-500">
                      {shipment?.status === "released" ? "Ready to ship" : "Waiting"}
                    </span>
                  </div>

                  {shipment?.chainTxHash && (
                    <p className="mt-2 break-all text-[11px] text-gray-400">
                      Tx: {shipment.chainTxHash}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* -----------------------------------------------------
          FARMER DISCOVERY
      ----------------------------------------------------- */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-5">
          <MapPinned size={15} className="text-violet-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Farmer discovery</h3>
            <p className="text-xs text-gray-400">Explore geo-tagged farmers and crops</p>
          </div>
        </div>

        <div className="h-[500px]">
          <CropMap />
        </div>

      </div>

    </div>
  );
}