import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  FileText,
  Loader2,
  PackageCheck,
  ReceiptText,
  WalletCards,
} from "lucide-react";

interface Activity {
  id: string;

  type:
    | "payment"
    | "message"
    | "invoice"
    | "shipment";

  title: string;
  description: string;
  time: string;

  orderId?: string;

  invoice?: {
    invoiceNumber: string;
    pdfUrl: string;
  };

  payment?: {
    amount: number;
    currency: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };

  shipment?: {
    amount: number;
    percent: number;
    status: string;
  };
}

type ActivityFilter =
  | "all"
  | "payment"
  | "shipment"
  | "invoice";

function formatRelativeTime(time: string) {
  const date = new Date(time);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount?: number) {
  if (typeof amount !== "number") {
    return "₹0";
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function FarmerBusinessActivity() {
  const navigate = useNavigate();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] =
    useState<ActivityFilter>("all");

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem("farmerToken") ||
          localStorage.getItem("token");

        if (!token) {
          setError(
            "Your session has expired. Please login again."
          );
          return;
        }

        const response = await axios.get(
          "http://localhost:8000/api/farmers/activity",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data?.success) {
          /*
           * Messages are deliberately removed from
           * business activity.
           *
           * Messages belong in the Messages section.
           */
          const businessActivities =
            Array.isArray(response.data.activities)
              ? response.data.activities.filter(
                  (activity: Activity) =>
                    activity.type !== "message"
                )
              : [];

          setActivities(businessActivities);
        } else {
          setActivities([]);
          setError(
            "Unable to load business activity."
          );
        }
      } catch (err: any) {
        console.error(
          "Fetch farmer business activity error:",
          err
        );

        if (err.response?.status === 401) {
          setError(
            "Your session has expired. Please login again."
          );
        } else {
          setError(
            err.response?.data?.error ||
              "Failed to fetch business activity."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  /*
   * Filter activities for the selected tab.
   */
  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") {
      return activities;
    }

    return activities.filter(
      (activity) =>
        activity.type === activeFilter
    );
  }, [activities, activeFilter]);

  /*
   * Counts shown on the tabs.
   */
  const counts = useMemo(() => {
    return {
      all: activities.length,

      payment: activities.filter(
        (activity) =>
          activity.type === "payment"
      ).length,

      shipment: activities.filter(
        (activity) =>
          activity.type === "shipment"
      ).length,

      invoice: activities.filter(
        (activity) =>
          activity.type === "invoice"
      ).length,
    };
  }, [activities]);

  const getIcon = (
    type: Activity["type"]
  ) => {
    switch (type) {
      case "payment":
        return <WalletCards size={18} />;

      case "invoice":
        return <ReceiptText size={18} />;

      case "shipment":
        return <PackageCheck size={18} />;

      default:
        return <FileText size={18} />;
    }
  };

  const getIconStyle = (
    type: Activity["type"]
  ) => {
    switch (type) {
      case "payment":
        return "bg-emerald-50 text-emerald-600";

      case "invoice":
        return "bg-violet-50 text-violet-600";

      case "shipment":
        return "bg-orange-50 text-orange-600";

      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const handleActivityClick = (
    activity: Activity
  ) => {
    /*
     * INVOICE
     *
     * Keep the existing public invoice route.
     */
    if (
      activity.type === "invoice" &&
      activity.invoice?.pdfUrl
    ) {
      const pdfUrl =
        activity.invoice.pdfUrl.startsWith(
          "http"
        )
          ? activity.invoice.pdfUrl
          : `http://localhost:8000${activity.invoice.pdfUrl}`;

      window.open(
        pdfUrl,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    /*
     * Payment and shipment currently don't
     * navigate anywhere because we haven't
     * defined the farmer order-detail route.
     *
     * Keep the orderId internally available.
     */
    if (
      (activity.type === "payment" ||
        activity.type === "shipment") &&
      activity.orderId
    ) {
      console.log(
        "Selected order:",
        activity.orderId
      );
    }
  };

  const filterButtons: {
    id: ActivityFilter;
    label: string;
  }[] = [
    {
      id: "all",
      label: "All",
    },
    {
      id: "payment",
      label: "Payments",
    },
    {
      id: "shipment",
      label: "Shipments",
    },
    {
      id: "invoice",
      label: "Invoices",
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-white bg-white/80 shadow-[0_8px_30px_rgba(40,80,45,0.05)] backdrop-blur-xl">

      {/* HEADER */}
      <div className="border-b border-gray-100 px-5 pt-5">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <WalletCards size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Business activity
              </h2>

              <p className="mt-0.5 text-xs text-gray-400">
                Payments, shipments and invoices
              </p>
            </div>

          </div>

          <span className="hidden rounded-full bg-gray-50 px-3 py-1 text-[10px] font-medium text-gray-500 sm:block">
            {activities.length} records
          </span>

        </div>

        {/* FILTERS */}
        <div className="mt-5 flex gap-1 overflow-x-auto pb-0">

          {filterButtons.map((filter) => {
            const active =
              activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() =>
                  setActiveFilter(filter.id)
                }
                className={`whitespace-nowrap border-b-2 px-3 pb-3 text-xs font-semibold transition ${
                  active
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {filter.label}

                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${
                    active
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-50 text-gray-400"
                  }`}
                >
                  {counts[filter.id]}
                </span>
              </button>
            );
          })}

        </div>

      </div>

      {/* BODY */}
      <div className="divide-y divide-gray-100">

        {/* LOADING */}
        {loading && (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-gray-400">

            <Loader2
              size={16}
              className="animate-spin"
            />

            Loading business activity...

          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="px-5 py-10 text-center">

            <p className="text-sm font-medium text-red-500">
              {error}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Please refresh the page and try again.
            </p>

          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          filteredActivities.length === 0 && (
            <div className="px-5 py-10 text-center">

              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                {activeFilter === "shipment" ? (
                  <PackageCheck size={19} />
                ) : activeFilter ===
                  "invoice" ? (
                  <ReceiptText size={19} />
                ) : (
                  <WalletCards size={19} />
                )}
              </div>

              <p className="mt-3 text-sm font-medium text-gray-600">
                No{" "}
                {activeFilter === "all"
                  ? "business"
                  : activeFilter}{" "}
                activity yet
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Your business activity will appear here.
              </p>

            </div>
          )}

        {/* ACTIVITY LIST */}
        {!loading &&
          !error &&
          filteredActivities.map(
            (activity) => {

              const clickable =
                activity.type ===
                "invoice";

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() =>
                    handleActivityClick(
                      activity
                    )
                  }
                  className={`group flex w-full items-center gap-3 px-5 py-4 text-left transition ${
                    clickable
                      ? "hover:bg-gray-50/80"
                      : ""
                  }`}
                >

                  {/* ICON */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getIconStyle(
                      activity.type
                    )}`}
                  >
                    {getIcon(
                      activity.type
                    )}
                  </div>

                  {/* MAIN CONTENT */}
                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-semibold text-gray-800">
                      {activity.title}
                    </p>

                    <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                      {activity.description}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3">

                      <span className="text-[10px] text-gray-400">
                        {formatRelativeTime(
                          activity.time
                        )}
                      </span>

                      {/* PAYMENT AMOUNT */}
                      {activity.payment && (
                        <span className="text-[10px] font-semibold text-emerald-600">
                          {formatCurrency(
                            activity.payment
                              .amount
                          )}
                        </span>
                      )}

                      {/* SHIPMENT */}
                      {activity.shipment && (
                        <span className="text-[10px] font-semibold text-orange-600">
                          {
                            activity
                              .shipment
                              .percent
                          }
                          % released
                        </span>
                      )}

                      {/* INVOICE NUMBER */}
                      {activity.invoice && (
                        <span className="text-[10px] font-medium text-violet-600">
                          {
                            activity
                              .invoice
                              .invoiceNumber
                          }
                        </span>
                      )}

                    </div>

                  </div>

                  {/* RIGHT SIDE */}
                  {activity.type ===
                    "invoice" && (
                    <ArrowRight
                      size={15}
                      className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500"
                    />
                  )}

                </button>
              );
            }
          )}

      </div>

    </section>
  );
}