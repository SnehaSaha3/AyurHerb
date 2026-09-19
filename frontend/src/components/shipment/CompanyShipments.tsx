import { useEffect, useState } from "react";
import axios from "axios";

import {
  Truck,
  Package,
  User,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  Route,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type ShipmentStatus =
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";

interface Shipment {
  _id: string;

  orderId: {
    _id: string;
    cropName: string;
    quantity: number;
    amount: number;
    status: string;
  };

  farmerId: {
    _id: string;
    name: string;
    address?: string;
    contact?: string;
  };

  vehicle: {
    vehicleId: string;
    vehicleNumber: string;
    vehicleType: string;
    capacityKg: number;
    driverName: string;
    driverContact: string;
  };

  pickup: {
    lat: number;
    lng: number;
    address?: string;
  };

  distanceKm?: number;

  quantityKg: number;

  status: ShipmentStatus;

  logisticsAgent: {
    agent: string;
    reason: string;
    confidence: number;
    assignedAt: string;
  };

  createdAt: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
}

const statusLabels: Record<ShipmentStatus, string> = {
  assigned: "Vehicle Assigned",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusIcons: Record<
  ShipmentStatus,
  typeof Truck
> = {
  assigned: Truck,
  picked_up: Package,
  in_transit: Navigation,
  delivered: CheckCircle2,
  cancelled: Clock,
};

function CompanyShipments() {
  const [shipments, setShipments] =
    useState<Shipment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] =
    useState<string | null>(null);

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      const token =
        localStorage.getItem("companyToken");

      if (!token) {
        setError("Company session not found.");
        return;
      }

      const response = await axios.get(
        "https://ayurherb-backend-7yw4.onrender.com/api/shipments/company",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setShipments(
        response.data.shipments || []
      );
    } catch (error: any) {
      console.error(
        "❌ Failed to load shipments:",
        error
      );

      setError(
        error?.response?.data?.message ||
          "Failed to load shipments."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-5">
          <div className="h-10 w-64 rounded-xl bg-slate-200" />
          <div className="h-32 rounded-2xl bg-slate-200" />
          <div className="h-64 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-700">
            Unable to load shipments
          </h2>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>

          <button
            onClick={loadShipments}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const assigned = shipments.filter(
    (s) => s.status === "assigned"
  ).length;

  const inTransit = shipments.filter(
    (s) => s.status === "in_transit"
  ).length;

  const delivered = shipments.filter(
    (s) => s.status === "delivered"
  ).length;

  return (
    <div className="min-h-full bg-slate-50 p-6 md:p-8">
      {/* Header */}

      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-100 p-3">
            <Truck className="h-7 w-7 text-emerald-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Shipments
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Shipments automatically managed by
              the Logistics Agent
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Truck />}
          title="Total"
          value={shipments.length}
        />

        <Stat
          icon={<Clock />}
          title="Assigned"
          value={assigned}
        />

        <Stat
          icon={<Navigation />}
          title="In Transit"
          value={inTransit}
        />

        <Stat
          icon={<CheckCircle2 />}
          title="Delivered"
          value={delivered}
        />
      </div>

      {/* Empty */}

      {shipments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <Truck className="mx-auto h-14 w-14 text-slate-300" />

          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            No shipments yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Once an order is successfully paid
            and released for shipment, the
            Logistics Agent will automatically
            assign a vehicle.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {shipments.map((shipment) => {
            const StatusIcon =
              statusIcons[shipment.status];

            const isExpanded =
              expanded === shipment._id;

            return (
              <div
                key={shipment._id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-6">
                  {/* Top */}

                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="flex gap-4">
                      <div className="rounded-2xl bg-emerald-50 p-4">
                        <Package className="h-7 w-7 text-emerald-600" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-bold text-slate-900">
                            {
                              shipment.orderId
                                ?.cropName
                            }
                          </h2>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {
                              shipment.quantityKg
                            }{" "}
                            kg
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          Order #
                          {shipment.orderId?._id?.slice(
                            -8
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2">
                      <StatusIcon className="h-4 w-4 text-emerald-600" />

                      <span className="text-sm font-semibold text-slate-700">
                        {
                          statusLabels[
                            shipment.status
                          ]
                        }
                      </span>
                    </div>
                  </div>

                  {/* Vehicle information */}

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <InfoCard
                      icon={<Truck />}
                      title="Vehicle"
                      value={
                        shipment.vehicle
                          .vehicleNumber
                      }
                      subtitle={`${shipment.vehicle.vehicleType} • ${shipment.vehicle.capacityKg} kg`}
                    />

                    <InfoCard
                      icon={<User />}
                      title="Driver"
                      value={
                        shipment.vehicle
                          .driverName
                      }
                      subtitle={
                        shipment.vehicle
                          .driverContact
                      }
                    />

                    <InfoCard
                      icon={<Route />}
                      title="Distance"
                      value={
                        shipment.distanceKm !=
                        null
                          ? `${shipment.distanceKm.toFixed(
                              2
                            )} km`
                          : "—"
                      }
                      subtitle="Vehicle → Farm"
                    />
                  </div>

                  {/* AI */}

                  <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                    <div className="flex gap-3">
                      <div className="rounded-xl bg-violet-100 p-2">
                        <BrainCircuit className="h-5 w-5 text-violet-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-violet-900">
                            Logistics Agent
                          </h3>

                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                            {Math.round(
                              shipment
                                .logisticsAgent
                                .confidence *
                                100
                            )}
                            % confidence
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-violet-800">
                          {
                            shipment
                              .logisticsAgent
                              .reason
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pickup */}

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <div className="flex gap-3">
                      <MapPin className="mt-1 h-5 w-5 text-emerald-600" />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Pickup Location
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {
                            shipment.pickup
                              .address
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            shipment.pickup.lat
                          }
                          ,{" "}
                          {
                            shipment.pickup.lng
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expand */}

                  <button
                    onClick={() =>
                      setExpanded(
                        isExpanded
                          ? null
                          : shipment._id
                      )
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {isExpanded
                      ? "Hide details"
                      : "View shipment details"}

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-2">
                      <Detail
                        label="Vehicle ID"
                        value={
                          shipment.vehicle
                            .vehicleId
                        }
                      />

                      <Detail
                        label="Vehicle Type"
                        value={
                          shipment.vehicle
                            .vehicleType
                        }
                      />

                      <Detail
                        label="Driver"
                        value={
                          shipment.vehicle
                            .driverName
                        }
                      />

                      <Detail
                        label="Driver Contact"
                        value={
                          shipment.vehicle
                            .driverContact
                        }
                      />

                      <Detail
                        label="Farmer"
                        value={
                          shipment.farmerId
                            ?.name || "—"
                        }
                      />

                      <Detail
                        label="Farmer Contact"
                        value={
                          shipment.farmerId
                            ?.contact || "—"
                        }
                      />

                      <Detail
                        label="Created"
                        value={new Date(
                          shipment.createdAt
                        ).toLocaleString("en-IN")}
                      />

                      <Detail
                        label="Assigned"
                        value={new Date(
                          shipment
                            .logisticsAgent
                            .assignedAt
                        ).toLocaleString(
                          "en-IN"
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex gap-3">
        <div className="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs text-slate-400">
            {title}
          </p>

          <p className="truncate text-sm font-bold text-slate-800">
            {value}
          </p>

          <p className="truncate text-xs text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

export default CompanyShipments;