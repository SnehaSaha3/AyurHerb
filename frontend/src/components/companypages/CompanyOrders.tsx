import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Package,
  Search,
  Sprout,
  Truck,
  WalletCards,
} from "lucide-react";

interface Farmer {
  _id: string;
  name: string;
  address?: string;
}

interface Invoice {
  qrToken: string;
}

interface Escrow {
  escrowChainTxHash?: string;
}

interface Order {
  _id: string;
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
  };

  stockCheck?: {
    passed: boolean;
  };

  escrow?: Escrow;
  invoice?: Invoice;
}

type Filter =
  | "all"
  | "awaiting_payment"
  | "processing"
  | "shipment"
  | "delivered"
  | "rejected";

export default function CompanyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("companyToken");

      if (!token) return;

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
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {

      const matchesSearch =
        order.cropName
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        order.farmerId?.name
          ?.toLowerCase()
          .includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === "all") return true;

      if (filter === "processing") {
        return [
          "pending_verification",
          "pending_stock_check",
          "payment_processing",
          "escrow_funded",
        ].includes(order.status);
      }

      if (filter === "shipment") {
        return [
          "shipment_released",
          "delivery_released",
        ].includes(order.status);
      }

      return order.status === filter;
    });
  }, [orders, filter, search]);

  const cropDemand = useMemo(() => {
    const data: Record<string, number> = {};

    orders.forEach((order) => {
      data[order.cropName] =
        (data[order.cropName] || 0) +
        Number(order.quantity || 0);
    });

    return Object.entries(data)
      .map(([crop, quantity]) => ({
        crop,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  const totalValue = orders.reduce(
    (total, order) =>
      total +
      Number(
        order.fees?.grandTotal ||
          order.amount ||
          0
      ),
    0
  );

  const openInvoice = (order: Order) => {
    if (!order.invoice?.qrToken) {
      alert("Invoice has not been generated yet.");
      return;
    }

    window.open(
      `http://localhost:8000/api/public/verify/${order._id}/${order.invoice.qrToken}/pdf`,
      "_blank"
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-gray-500">
        Loading orders...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
            Procurement
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-gray-800">
            Orders
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage procurement, payments and invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-xs font-medium text-green-700">
          <Package size={15} />
          {orders.length} total orders
        </div>

      </div>

      {/* INSIGHT CARDS */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <Insight
          icon={<Sprout size={18} />}
          title="Most ordered crop"
          value={cropDemand[0]?.crop || "—"}
          detail={
            cropDemand[0]
              ? `${cropDemand[0].quantity} kg`
              : "No order data"
          }
          tone="green"
        />

        <Insight
          icon={<WalletCards size={18} />}
          title="Procurement value"
          value={`₹${totalValue.toLocaleString("en-IN")}`}
          detail="Across all orders"
          tone="blue"
        />

        <Insight
          icon={<TrendingIcon />}
          title="Crop diversity"
          value={`${cropDemand.length}`}
          detail="Different crops ordered"
          tone="purple"
        />

      </div>

      {/* DEMAND */}

      {cropDemand.length > 0 && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-gray-800">
                Most Demanded Crops
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Based on quantity ordered by your company.
              </p>
            </div>

          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">

            {cropDemand.slice(0, 6).map((item, index) => {

              const max =
                cropDemand[0]?.quantity || 1;

              const percentage =
                (item.quantity / max) * 100;

              return (
                <div
                  key={item.crop}
                  className="rounded-xl bg-gray-50 p-3"
                >

                  <div className="flex justify-between">

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        #{index + 1}
                      </span>

                      <span className="text-sm font-medium text-gray-700">
                        {item.crop}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-gray-600">
                      {item.quantity} kg
                    </span>

                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                </div>
              );
            })}

          </div>

        </div>
      )}

      {/* FILTERS */}

      <div className="rounded-2xl border bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex flex-wrap gap-2">

            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All
            </FilterButton>

            <FilterButton
              active={filter === "awaiting_payment"}
              onClick={() =>
                setFilter("awaiting_payment")
              }
            >
              Payment Required
            </FilterButton>

            <FilterButton
              active={filter === "processing"}
              onClick={() => setFilter("processing")}
            >
              Processing
            </FilterButton>

            <FilterButton
              active={filter === "shipment"}
              onClick={() => setFilter("shipment")}
            >
              Shipment
            </FilterButton>

            <FilterButton
              active={filter === "delivered"}
              onClick={() =>
                setFilter("delivered")
              }
            >
              Delivered
            </FilterButton>

            <FilterButton
              active={filter === "rejected"}
              onClick={() =>
                setFilter("rejected")
              }
            >
              Rejected
            </FilterButton>

          </div>

          <div className="relative w-full lg:w-64">

            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search crop or farmer..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-green-400 focus:bg-white"
            />

          </div>

        </div>

      </div>

      {/* ORDERS */}

      <div className="space-y-3">

        {filteredOrders.map((order) => {

          const amount =
            order.fees?.grandTotal ||
            order.amount ||
            0;

          const paymentRequired =
            order.status ===
            "awaiting_payment";

          return (
            <div
              key={order._id}
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >

              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

                <div className="flex items-start gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                    <Sprout size={21} />
                  </div>

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <h3 className="font-semibold text-gray-800">
                        {order.cropName}
                      </h3>

                      <Status status={order.status} />

                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Farmer:{" "}
                      {order.farmerId?.name ||
                        "Unknown farmer"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">

                      <span>
                        Quantity:{" "}
                        <strong className="text-gray-700">
                          {order.quantity} kg
                        </strong>
                      </span>

                      <span>
                        Value:{" "}
                        <strong className="text-gray-700">
                          ₹{Number(amount).toLocaleString("en-IN")}
                        </strong>
                      </span>

                    </div>

                  </div>

                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">

                  {paymentRequired && (
                    <PaymentButton
                      order={order}
                      onSuccess={fetchOrders}
                    />
                  )}

                  {order.invoice && (
                    <button
                      onClick={() =>
                        openInvoice(order)
                      }
                      className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <FileText size={14} />
                      Invoice
                    </button>
                  )}

                  {order.status ===
                    "shipment_released" && (
                    <span className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                      <Truck size={14} />
                      Shipment ready
                    </span>
                  )}

                </div>

              </div>

              {(order.verification?.passed ||
                order.stockCheck?.passed) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">

                  {order.verification?.passed && (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700">
                      <CheckCircle2 size={11} />
                      Agent verified
                    </span>
                  )}

                  {order.stockCheck?.passed && (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700">
                      <CheckCircle2 size={11} />
                      Stock confirmed
                    </span>
                  )}

                  {order.escrow?.escrowChainTxHash && (
                    <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-medium text-purple-700">
                      On-chain escrow
                    </span>
                  )}

                </div>
              )}

            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-white py-14 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <Package size={20} />
            </div>

            <p className="mt-3 text-sm font-medium text-gray-600">
              No orders found
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Try changing the filter or search term.
            </p>

          </div>
        )}

      </div>

    </div>
  );
}

/* ============================================================
   PAYMENT BUTTON
============================================================ */

function PaymentButton({
  order,
  onSuccess,
}: {
  order: Order;
  onSuccess: () => void;
}) {
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    try {
      setPaying(true);

      const token =
        localStorage.getItem("companyToken");

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
          data.error || "Unable to create payment"
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay is still loading. Try again."
        );
      }

      const razorpay =
        new window.Razorpay({
          key: data.keyId,
          amount: data.amountPaise,
          currency: data.currency || "INR",
          name: "AyurHerb",
          description: `Payment for ${order.cropName}`,
          order_id: data.razorpayOrderId,

          handler: async (response: any) => {
            try {
              const verifyRes =
                await axios.post(
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

              alert(
                "Payment successful. Escrow funded."
              );

              onSuccess();
            } catch (error: any) {
              alert(
                error.response?.data?.error ||
                  error.message ||
                  "Payment verification failed"
              );
            } finally {
              setPaying(false);
            }
          },

          modal: {
            ondismiss: () => {
              setPaying(false);
            },
          },

          theme: {
            color: "#16a34a",
          },
        });

      razorpay.open();
    } catch (error: any) {
      alert(
        error.response?.data?.error ||
          error.message ||
          "Payment failed"
      );

      setPaying(false);
    }
  };

  return (
    <button
      onClick={pay}
      disabled={paying}
      className="flex items-center gap-2 rounded-xl bg-[#1f7a3f] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#176332] disabled:opacity-50"
    >
      <WalletCards size={14} />

      {paying ? "Opening..." : "Pay Now"}
    </button>
  );
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function Insight({
  icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "purple";
}) {
  const styles = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
        <span className={styles[tone]}>
          {icon}
        </span>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        {title}
      </p>

      <p className="mt-1 text-xl font-semibold text-gray-800">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        {detail}
      </p>

    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
        active
          ? "bg-green-700 text-white"
          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Status({ status }: { status: string }) {
  const config: Record<
    string,
    { text: string; className: string }
  > = {
    awaiting_payment: {
      text: "Payment Required",
      className:
        "bg-amber-100 text-amber-700",
    },

    payment_processing: {
      text: "Payment Processing",
      className:
        "bg-blue-100 text-blue-700",
    },

    escrow_funded: {
      text: "Escrow Funded",
      className:
        "bg-green-100 text-green-700",
    },

    shipment_released: {
      text: "Shipment Ready",
      className:
        "bg-green-100 text-green-700",
    },

    delivery_released: {
      text: "Delivered",
      className:
        "bg-purple-100 text-purple-700",
    },

    pending_verification: {
      text: "Agent Review",
      className:
        "bg-yellow-100 text-yellow-700",
    },

    pending_stock_check: {
      text: "Stock Check",
      className:
        "bg-orange-100 text-orange-700",
    },

    insufficient_stock: {
      text: "Insufficient Stock",
      className:
        "bg-red-100 text-red-700",
    },

    verification_failed: {
      text: "Verification Failed",
      className:
        "bg-red-100 text-red-700",
    },

    rejected: {
      text: "Rejected",
      className:
        "bg-red-100 text-red-700",
    },
  };

  const current = config[status] || {
    text: status.replaceAll("_", " "),
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${current.className}`}
    >
      {current.text}
    </span>
  );
}

function TrendingIcon() {
  return <TrendingUpIcon />;
}

function TrendingUpIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}