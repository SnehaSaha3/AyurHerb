import { useEffect, useState } from "react";
import axios from "axios";

import {
  Truck,
  Package,
  User,
  Phone,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  BrainCircuit,
} from "lucide-react";

type ShipmentStatus =
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";

interface Shipment {
  _id: string;

  companyId?: {
    _id: string;
    name: string;
    email?: string;
  };

  orderId: {
    _id: string;
    cropName: string;
    quantity: number;
    status: string;
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

const steps: {
  status: ShipmentStatus;
  label: string;
}[] = [
  {
    status: "assigned",
    label: "Vehicle Assigned",
  },
  {
    status: "picked_up",
    label: "Crop Picked Up",
  },
  {
    status: "in_transit",
    label: "In Transit",
  },
  {
    status: "delivered",
    label: "Delivered",
  },
];

function FarmerShipments() {
  const [shipments, setShipments] =
    useState<Shipment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      const token =
        localStorage.getItem("farmerToken");

      if (!token) {
        setError("Farmer session not found.");
        return;
      }

      const response = await axios.get(
        "http://localhost:8000/api/shipments/farmer",
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
        "❌ Failed to load farmer shipments:",
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
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-5">
          <div className="h-10 w-56 rounded-xl bg-slate-200" />
          <div className="h-72 rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
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
              My Shipments
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track your crop pickup and delivery
            </p>
          </div>
        </div>
      </div>

      {shipments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <Truck className="mx-auto h-14 w-14 text-slate-300" />

          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            No shipments yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Once your crop order is confirmed
            and released for shipment, your
            assigned vehicle will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {shipments.map((shipment) => (
            <ShipmentCard
              key={shipment._id}
              shipment={shipment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShipmentCard({
  shipment,
}: {
  shipment: Shipment;
}) {
  const currentIndex = steps.findIndex(
    (step) => step.status === shipment.status
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6 md:p-8">
        {/* Crop */}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex gap-4">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <Package className="h-7 w-7 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {shipment.orderId.cropName}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {shipment.quantityKg} kg
              </p>

              {shipment.companyId?.name && (
                <p className="mt-1 text-xs text-slate-400">
                  Buyer: {shipment.companyId.name}
                </p>
              )}
            </div>
          </div>

          <StatusBadge
            status={shipment.status}
          />
        </div>

        {/* Vehicle */}

        <div className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-600" />

            <h3 className="font-bold text-slate-800">
              Your Assigned Vehicle
            </h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">
                Vehicle Number
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {
                  shipment.vehicle
                    .vehicleNumber
                }
              </p>

              <p className="text-sm text-slate-500">
                {
                  shipment.vehicle
                    .vehicleType
                }
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Capacity
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {
                  shipment.vehicle
                    .capacityKg
                }{" "}
                kg
              </p>

              <p className="text-sm text-slate-500">
                Your shipment:{" "}
                {shipment.quantityKg} kg
              </p>
            </div>
          </div>
        </div>

        {/* Driver */}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex gap-3">
              <div className="rounded-xl bg-white p-2 shadow-sm">
                <User className="h-5 w-5 text-emerald-600" />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Driver
                </p>

                <p className="mt-1 font-bold text-slate-800">
                  {
                    shipment.vehicle
                      .driverName
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-4 w-4 text-emerald-600" />

              {
                shipment.vehicle
                  .driverContact
              }
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex gap-3">
              <div className="rounded-xl bg-white p-2 shadow-sm">
                <Navigation className="h-5 w-5 text-emerald-600" />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Vehicle Distance
                </p>

                <p className="mt-1 font-bold text-slate-800">
                  {shipment.distanceKm !=
                  null
                    ? `${shipment.distanceKm.toFixed(
                        2
                      )} km`
                    : "—"}
                </p>

                <p className="text-xs text-slate-400">
                  From vehicle to your farm
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup */}

        <div className="mt-5 rounded-2xl bg-slate-50 p-5">
          <div className="flex gap-3">
            <MapPin className="mt-1 h-5 w-5 text-emerald-600" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pickup Location
              </p>

              <p className="mt-1 font-medium text-slate-800">
                {shipment.pickup.address ||
                  "Your registered farm location"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {shipment.pickup.lat},{" "}
                {shipment.pickup.lng}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}

        <div className="mt-8">
          <h3 className="mb-5 font-bold text-slate-800">
            Shipment Progress
          </h3>

          <div className="space-y-5">
            {steps.map((step, index) => {
              const completed =
                index <= currentIndex;

              const active =
                index === currentIndex;

              return (
                <div
                  key={step.status}
                  className="flex items-center gap-4"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      completed
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        active
                          ? "text-emerald-600"
                          : completed
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI */}

        <div className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <div className="flex gap-3">
            <div className="rounded-xl bg-violet-100 p-2">
              <BrainCircuit className="h-5 w-5 text-violet-600" />
            </div>

            <div>
              <h3 className="font-bold text-violet-900">
                Logistics Agent
              </h3>

              <p className="mt-2 text-sm leading-6 text-violet-800">
                Your vehicle was automatically
                selected based on availability,
                carrying capacity and distance
                from your farm.
              </p>

              <p className="mt-2 text-sm text-violet-700">
                {
                  shipment.logisticsAgent
                    .reason
                }
              </p>

              <p className="mt-2 text-xs text-violet-600">
                AI confidence:{" "}
                {Math.round(
                  shipment.logisticsAgent
                    .confidence * 100
                )}
                %
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ShipmentStatus;
}) {
  const labels: Record<
    ShipmentStatus,
    string
  > = {
    assigned: "Vehicle Assigned",
    picked_up: "Picked Up",
    in_transit: "In Transit",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  return (
    <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
      <Truck className="h-4 w-4" />
      {labels[status]}
    </div>
  );
}

export default FarmerShipments;