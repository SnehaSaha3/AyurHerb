import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Leaf,
  Link2,
  PackageCheck,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Farmer {
  _id: string;
  name: string;
}

interface Escrow {
  escrowChainTxHash?: string;
  amountPaidPaise?: number;
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
  cropName: string;
  quantity: number;
  amount: number;
  status: string;
  farmerId?: Farmer;
  fees?: {
    grandTotal?: number;
  };
  escrow?: Escrow;
  tranches?: Tranche[];
}

interface CompanyStats {
  activeOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalSpend: number;
}

export default function CompanyHome() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<CompanyStats>({
    activeOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    totalSpend: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("companyToken");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          "http://localhost:8000/api/orders/company",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data?.success) {
          setOrders(response.data.orders || []);

          setStats(
            response.data.stats || {
              activeOrders: 0,
              pendingOrders: 0,
              deliveredOrders: 0,
              totalSpend: 0,
            }
          );
        }
      } catch (error) {
        console.error("Failed to load company overview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const systemStats = useMemo(() => {
    const uniqueFarmers = new Set(
      orders
        .map((order) => order.farmerId?._id)
        .filter(Boolean)
    );

    const escrowOrders = orders.filter(
      (order) => order.escrow?.escrowChainTxHash
    );

    const shipmentOrders = orders.filter((order) => {
      const shipment = order.tranches?.find(
        (tranche) => tranche.type === "shipment"
      );

      return shipment?.status === "released";
    });

    const delayedOrders = orders.filter(
      (order) =>
        order.status === "shipment_delayed" ||
        order.status === "delayed"
    );

    return {
      farmers: uniqueFarmers.size,
      escrow: escrowOrders.length,
      shipments: shipmentOrders.length,
      delayed: delayedOrders.length,
    };
  }, [orders]);

  const attentionItems = useMemo(() => {
    const items: {
      title: string;
      description: string;
      route: string;
      icon: React.ReactNode;
    }[] = [];

    const paymentOrders = orders.filter(
      (order) => order.status === "awaiting_payment"
    );

    if (paymentOrders.length > 0) {
      items.push({
        title: `${paymentOrders.length} order${
          paymentOrders.length > 1 ? "s" : ""
        } awaiting payment`,
        description:
          "Verified procurement requests are ready for escrow funding.",
        route: "/company-dashboard/orders",
        icon: <Clock3 size={16} />,
      });
    }

    const verificationOrders = orders.filter(
      (order) =>
        order.status === "pending_verification" ||
        order.status === "pending_stock_check"
    );

    if (verificationOrders.length > 0) {
      items.push({
        title: `${verificationOrders.length} order${
          verificationOrders.length > 1 ? "s" : ""
        } under agent review`,
        description:
          "Verification or stock checks are still being processed.",
        route: "/company-dashboard/orders",
        icon: <ShieldCheck size={16} />,
      });
    }

    if (systemStats.delayed > 0) {
      items.push({
        title: `${systemStats.delayed} shipment${
          systemStats.delayed > 1 ? "s" : ""
        } delayed`,
        description:
          "Check the logistics workspace for the latest shipment state.",
        route: "/company-dashboard/shipments",
        icon: <Truck size={16} />,
      });
    }

    return items.slice(0, 3);
  }, [orders, systemStats.delayed]);

  const recentActivity = useMemo(() => {
    return orders
      .slice()
      .sort((a, b) => {
        return (
          String(b._id).localeCompare(String(a._id))
        );
      })
      .slice(0, 5);
  }, [orders]);

  const formatMoney = (value: number) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "awaiting_payment":
        return "Payment required";

      case "payment_processing":
        return "Payment processing";

      case "escrow_funded":
        return "Escrow funded";

      case "shipment_released":
        return "Shipment released";

      case "delivery_released":
        return "Delivered";

      case "pending_verification":
        return "Agent verification";

      case "pending_stock_check":
        return "Stock verification";

      case "verification_failed":
      case "rejected":
        return "Rejected";

      default:
        return status.replaceAll("_", " ");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
          Loading company overview...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">
              Supply network operational
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Company Overview
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            A live view of procurement, verification, escrow and logistics.
          </p>
        </div>

        <button
          onClick={() => navigate("/company-dashboard/explore")}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 md:self-auto"
        >
          Explore farm network
          <ArrowRight size={15} />
        </button>

      </section>


      {/* =====================================================
          SYSTEM METRICS
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          icon={<Users size={17} />}
          label="Connected farmers"
          value={systemStats.farmers}
          detail="Across your current orders"
        />

        <MetricCard
          icon={<PackageCheck size={17} />}
          label="Active procurement"
          value={stats.activeOrders}
          detail={`${stats.pendingOrders} pending`}
        />

        <MetricCard
          icon={<Link2 size={17} />}
          label="Escrow records"
          value={systemStats.escrow}
          detail="Blockchain-linked orders"
        />

        <MetricCard
          icon={<Truck size={17} />}
          label="Shipments moving"
          value={systemStats.shipments}
          detail={
            systemStats.delayed > 0
              ? `${systemStats.delayed} require attention`
              : "No delayed shipments"
          }
        />

      </section>


      {/* =====================================================
          NETWORK FLOW + ATTENTION
      ===================================================== */}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">

        {/* SUPPLY FLOW */}

        <div className="rounded-2xl border border-gray-200 bg-white">

          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Supply network
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Current state of the procurement pipeline
              </p>
            </div>

            <Leaf
              size={18}
              className="text-emerald-600"
            />

          </div>


          <div className="px-6 py-8">

            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">

              <FlowNode
                label="Farmers"
                value={systemStats.farmers}
                icon={<Users size={18} />}
              />

              <FlowNode
                label="Orders"
                value={stats.activeOrders}
                icon={<PackageCheck size={18} />}
              />

              <FlowNode
                label="Escrow"
                value={systemStats.escrow}
                icon={<Link2 size={18} />}
              />

              <FlowNode
                label="Shipments"
                value={systemStats.shipments}
                icon={<Truck size={18} />}
              />

            </div>


            <div className="mt-8 flex items-center gap-3">

              <div className="h-px flex-1 bg-gray-200" />

              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Verified supply flow
              </span>

              <div className="h-px flex-1 bg-gray-200" />

            </div>


            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">

              <SystemState
                icon={<ShieldCheck size={16} />}
                title="Agent verification"
                text="Orders pass verification before payment."
              />

              <SystemState
                icon={<Link2 size={16} />}
                title="Blockchain audit"
                text="Escrow events can be linked to chain records."
              />

              <SystemState
                icon={<Truck size={16} />}
                title="Automated release"
                text="Shipment state follows the procurement flow."
              />

            </div>

          </div>

        </div>


        {/* ATTENTION */}

        <div className="rounded-2xl border border-gray-200 bg-white">

          <div className="border-b border-gray-100 px-6 py-5">

            <h2 className="text-sm font-semibold text-gray-900">
              Needs attention
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Actions that currently require company attention.
            </p>

          </div>


          <div className="divide-y divide-gray-100">

            {attentionItems.length === 0 ? (

              <div className="flex flex-col items-center px-6 py-12 text-center">

                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={19} />
                </div>

                <p className="text-sm font-medium text-gray-800">
                  Everything looks clear
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  No immediate actions are waiting.
                </p>

              </div>

            ) : (

              attentionItems.map((item, index) => (

                <button
                  key={index}
                  onClick={() => navigate(item.route)}
                  className="group flex w-full items-start gap-3 px-6 py-4 text-left transition hover:bg-gray-50"
                >

                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    {item.icon}
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="text-sm font-medium text-gray-800">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {item.description}
                    </p>

                  </div>

                  <ArrowRight
                    size={14}
                    className="mt-2 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-600"
                  />

                </button>

              ))

            )}

          </div>

        </div>

      </section>


      {/* =====================================================
          PROCUREMENT + SYSTEM ACTIVITY
      ===================================================== */}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">

        {/* PROCUREMENT SNAPSHOT */}

        <div className="rounded-2xl border border-gray-200 bg-white">

          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Procurement snapshot
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                High-level financial state
              </p>
            </div>

            <button
              onClick={() => navigate("/company-dashboard/orders")}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              Open orders
              <ExternalLink size={12} />
            </button>

          </div>


          <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

            <div className="px-6 py-6">
              <p className="text-[11px] text-gray-400">
                Committed value
              </p>

              <p className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
                {formatMoney(stats.totalSpend)}
              </p>
            </div>

            <div className="px-6 py-6">
              <p className="text-[11px] text-gray-400">
                Pending payment
              </p>

              <p className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
                {orders.filter(
                  (order) =>
                    order.status === "awaiting_payment"
                ).length}
              </p>
            </div>

            <div className="px-6 py-6">
              <p className="text-[11px] text-gray-400">
                Delivered
              </p>

              <p className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
                {stats.deliveredOrders}
              </p>
            </div>

          </div>

        </div>


        {/* RECENT SYSTEM ACTIVITY */}

        <div className="rounded-2xl border border-gray-200 bg-white">

          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                System activity
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Latest procurement states
              </p>
            </div>

            <button
              onClick={() => navigate("/company-dashboard/orders")}
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              View all
            </button>

          </div>


          <div className="divide-y divide-gray-100">

            {recentActivity.length === 0 ? (

              <div className="px-6 py-10 text-center text-xs text-gray-400">
                No activity yet.
              </div>

            ) : (

              recentActivity.map((order) => (

                <button
                  key={order._id}
                  onClick={() =>
                    navigate("/company-dashboard/orders")
                  }
                  className="group flex w-full items-center gap-3 px-6 py-3.5 text-left hover:bg-gray-50"
                >

                  <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-xs font-medium text-gray-800">
                      {order.cropName}
                    </p>

                    <p className="mt-0.5 text-[10px] capitalize text-gray-400">
                      {getStatusLabel(order.status)}
                    </p>

                  </div>

                  <span className="text-[10px] text-gray-400">
                    {order.quantity} kg
                  </span>

                </button>

              ))

            )}

          </div>

        </div>

      </section>


      {/* =====================================================
          FOOTER STATEMENT
      ===================================================== */}

      <div className="border-t border-gray-200 pt-5">

        <div className="flex flex-col justify-between gap-2 text-[11px] text-gray-400 sm:flex-row">

          <p>
            AyurHerb procurement infrastructure
          </p>

          <p>
            Verification · Escrow · Blockchain audit · Logistics
          </p>

        </div>

      </div>

    </div>
  );
}


/* =============================================================
   SMALL COMPONENTS
============================================================= */

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          {icon}
        </div>

        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

      </div>

      <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-gray-400">
        {detail}
      </p>
    </motion.div>
  );
}


function FlowNode({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-gray-50/70 p-4">

      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
        {icon}
      </div>

      <p className="mt-4 text-[11px] text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold text-gray-900">
        {value}
      </p>

    </div>
  );
}


function SystemState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3.5">

      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        {icon}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-800">
          {title}
        </p>

        <p className="mt-1 text-[10px] leading-4 text-gray-400">
          {text}
        </p>
      </div>

    </div>
  );
}