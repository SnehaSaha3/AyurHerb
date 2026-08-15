import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
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

export default function CompanyHome() {
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

    return () => {
      // Don't remove it because other dashboard components
      // may use Razorpay as well.
    };
  }, []);

  /* ---------------------------------------------------------
     FETCH REAL COMPANY ORDERS
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
     REAL PAYMENT FLOW
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

      /*
       * STEP 1
       * Ask backend to create Razorpay order.
       */
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

      /*
       * Wait until Razorpay Checkout script exists.
       */
      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is still loading. Please try again."
        );
      }

      /*
       * STEP 2
       * Open Razorpay TEST checkout.
       */
      const razorpay = new window.Razorpay({
        key: data.keyId,

        amount: data.amountPaise,

        currency: data.currency || "INR",

        name: "AyurHerb",

        description: `Payment for ${order.cropName}`,

        order_id: data.razorpayOrderId,

        handler: async function (response: any) {
          try {
            /*
             * STEP 3
             * Send Razorpay response to backend.
             */
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
              "✅ Payment verified. Escrow funded and invoice generated."
            );

            /*
             * Refresh dashboard from MongoDB.
             */
            await fetchOrders();
          } catch (err: any) {
            console.error(
              "Payment verification error:",
              err
            );

            alert(
              err.response?.data?.error ||
                err.message ||
                "Payment verification failed"
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

        theme: {
          color: "#16a34a",
        },
      });

      razorpay.open();
    } catch (err: any) {
      console.error("Payment error:", err);

      alert(
        err.response?.data?.error ||
          err.message ||
          "Unable to start payment"
      );

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
      `http://localhost:8000/api/public/verify/` +
      `${order._id}/` +
      `${order.invoice.qrToken}/pdf`;

    window.open(url, "_blank");
  };

  /* ---------------------------------------------------------
     STATUS
  --------------------------------------------------------- */

  const getStatus = (order: Order) => {
    switch (order.status) {
      case "awaiting_payment":
        return {
          text: "Payment Required",
          className:
            "bg-amber-100 text-amber-700",
        };

      case "payment_processing":
        return {
          text: "Payment Processing",
          className:
            "bg-blue-100 text-blue-700",
        };

      case "escrow_funded":
        return {
          text: "Escrow Funded",
          className:
            "bg-emerald-100 text-emerald-700",
        };

      case "shipment_released":
        return {
          text: "Shipment Ready",
          className:
            "bg-green-100 text-green-700",
        };

      case "delivery_released":
        return {
          text: "Delivered",
          className:
            "bg-purple-100 text-purple-700",
        };

      case "pending_verification":
        return {
          text: "Agent Review",
          className:
            "bg-yellow-100 text-yellow-700",
        };

      case "pending_stock_check":
        return {
          text: "Stock Check",
          className:
            "bg-orange-100 text-orange-700",
        };

      case "insufficient_stock":
        return {
          text: "Insufficient Stock",
          className:
            "bg-red-100 text-red-700",
        };

      case "verification_failed":
      case "rejected":
        return {
          text: "Rejected",
          className:
            "bg-red-100 text-red-700",
        };

      default:
        return {
          text: order.status,
          className:
            "bg-gray-100 text-gray-700",
        };
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-gray-500">
        Loading company activity...
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* -----------------------------------------------------
          HEADER
      ----------------------------------------------------- */}

      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome back 👋
        </h1>

        <p className="text-sm text-gray-500">
          Manage procurement, payments, invoices and shipments
        </p>
      </div>

      {message && (
        <div className="rounded-xl border bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* -----------------------------------------------------
          REAL STATS
      ----------------------------------------------------- */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {[
          {
            title: "Active Orders",
            value: stats.activeOrders,
          },
          {
            title: "Pending Orders",
            value: stats.pendingOrders,
          },
          {
            title: "Delivered",
            value: stats.deliveredOrders,
          },
          {
            title: "Total Spend",
            value: `₹${stats.totalSpend.toLocaleString("en-IN")}`,
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl p-5 border shadow-sm"
          >
            <p className="text-xs text-gray-400">
              {item.title}
            </p>

            <p className="text-2xl font-semibold mt-2 text-gray-800">
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* -----------------------------------------------------
          PAYMENT REQUESTS
      ----------------------------------------------------- */}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="px-6 py-5 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Payment Requests
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Orders approved by the verification and stock agents
            are ready for payment.
          </p>
        </div>

        <div className="divide-y">

          {orders.filter(
            (o) => o.status === "awaiting_payment"
          ).length === 0 && (
            <div className="p-6 text-sm text-gray-400">
              No payment requests currently.
            </div>
          )}

          {orders
            .filter(
              (o) => o.status === "awaiting_payment"
            )
            .map((order) => (
              <div
                key={order._id}
                className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
              >

                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-800">
                      {order.cropName}
                    </h3>

                    <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">
                      Payment Required
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    Farmer:{" "}
                    {order.farmerId?.name ||
                      "Unknown farmer"}
                  </p>

                  <p className="text-sm text-gray-500">
                    Quantity: {order.quantity} kg
                  </p>

                  <p className="font-semibold text-gray-800 mt-2">
                    ₹
                    {(
                      order.fees?.grandTotal ||
                      order.amount
                    ).toLocaleString("en-IN")}
                  </p>
                </div>

                <button
                  onClick={() => startPayment(order)}
                  disabled={payingOrderId === order._id}
                  className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50"
                >
                  {payingOrderId === order._id
                    ? "Opening payment..."
                    : "Pay Now"}
                </button>

              </div>
            ))}
        </div>
      </div>

      {/* -----------------------------------------------------
          ORDERS
      ----------------------------------------------------- */}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="px-6 py-5 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Procurement Activity
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Live order, payment, escrow and shipment status.
          </p>
        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs text-gray-500">
                  Crop
                </th>

                <th className="text-left px-6 py-3 text-xs text-gray-500">
                  Farmer
                </th>

                <th className="text-left px-6 py-3 text-xs text-gray-500">
                  Quantity
                </th>

                <th className="text-left px-6 py-3 text-xs text-gray-500">
                  Amount
                </th>

                <th className="text-left px-6 py-3 text-xs text-gray-500">
                  Status
                </th>

                <th className="text-left px-6 py-3 text-xs text-gray-500">
                  Invoice
                </th>
              </tr>
            </thead>

            <tbody>

              {orders.map((order) => {

                const status = getStatus(order);

                return (
                  <tr
                    key={order._id}
                    className="border-t hover:bg-gray-50"
                  >

                    <td className="px-6 py-4 text-sm font-medium">
                      {order.cropName}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.farmerId?.name ||
                        "Unknown"}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.quantity} kg
                    </td>

                    <td className="px-6 py-4 text-sm font-medium">
                      ₹
                      {(
                        order.fees?.grandTotal ||
                        order.amount
                      ).toLocaleString("en-IN")}
                    </td>

                    <td className="px-6 py-4">

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}
                      >
                        {status.text}
                      </span>

                    </td>

                    <td className="px-6 py-4">

                      {order.invoice ? (
                        <button
                          onClick={() =>
                            openInvoice(order)
                          }
                          className="text-sm text-green-600 hover:text-green-800 font-medium"
                        >
                          📄 View Invoice
                        </button>
                      ) : order.status ===
                        "escrow_funded" ||
                        order.status ===
                        "shipment_released" ? (
                        <span className="text-xs text-gray-400">
                          Generating...
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Not generated
                        </span>
                      )}

                    </td>

                  </tr>
                );
              })}

              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-400"
                  >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border shadow-sm p-6">

          <h3 className="font-semibold text-gray-800 mb-4">
            Escrow Activity
          </h3>

          {orders
            .filter(
              (o) => o.escrow?.escrowChainTxHash
            )
            .slice(0, 5)
            .map((order) => (
              <div
                key={order._id}
                className="border rounded-xl p-4 mb-3"
              >

                <div className="flex justify-between">
                  <span className="font-medium">
                    {order.cropName}
                  </span>

                  <span className="text-xs text-green-600">
                    FUNDED
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-2 break-all">
                  TX:{" "}
                  {order.escrow?.escrowChainTxHash}
                </p>

              </div>
            ))}

          {orders.filter(
            (o) => o.escrow?.escrowChainTxHash
          ).length === 0 && (
            <p className="text-sm text-gray-400">
              No escrow transactions yet.
            </p>
          )}

        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">

          <h3 className="font-semibold text-gray-800 mb-4">
            Shipment Status
          </h3>

          {orders.slice(0, 5).map((order) => {

            const shipment = order.tranches?.find(
              (t) => t.type === "shipment"
            );

            return (
              <div
                key={order._id}
                className="border rounded-xl p-4 mb-3"
              >

                <div className="flex justify-between">

                  <span className="text-sm font-medium">
                    {order.cropName}
                  </span>

                  <span className="text-xs text-gray-500">
                    {shipment?.status === "released"
                      ? "🚚 Ready to Ship"
                      : "Waiting"}
                  </span>

                </div>

                {shipment?.chainTxHash && (
                  <p className="text-xs text-gray-400 mt-2 break-all">
                    TX: {shipment.chainTxHash}
                  </p>
                )}

              </div>
            );
          })}

        </div>

      </div>

      {/* -----------------------------------------------------
          FARMER DISCOVERY
      ----------------------------------------------------- */}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="px-6 py-5 border-b">

          <h3 className="font-semibold text-lg text-gray-800">
            🌍 Farmer Discovery
          </h3>

          <p className="text-xs text-gray-500">
            Explore geo-tagged farmers and crops
          </p>

        </div>

        <div className="h-[500px]">
          <CropMap />
        </div>

      </div>

    </div>
  );
}