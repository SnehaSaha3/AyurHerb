import axios from "axios";
import Shipment from "../models/shipment";

const AGENTS_URL =
  process.env.AGENTS_URL || "http://localhost:8001";

/*
 * Pickup scheduling heuristic — no real dispatcher exists yet, so
 * this stands in for one. Baseline is next-day pickup; distance
 * pushes it out further since a vehicle further from the farm
 * needs more lead time to arrive. Swap for real dispatcher
 * scheduling once that exists — callers only care about the
 * returned Date, not how it was derived.
 */
function computePickupDate(distanceKm: number): Date {
  const BASE_HOURS = 24;
  const EXTRA_HOURS_PER_50KM = 6;

  const extraHours =
    Math.floor(Math.max(0, distanceKm - 50) / 50) *
    EXTRA_HOURS_PER_50KM;

  const pickup = new Date();
  pickup.setHours(pickup.getHours() + BASE_HOURS + extraHours);
  return pickup;
}

export async function createShipmentForOrder(
  order: any,
  farmer: any
) {
  const farmerLat = Number(farmer.lat);
  const farmerLng = Number(farmer.lng);

  if (
    !Number.isFinite(farmerLat) ||
    !Number.isFinite(farmerLng)
  ) {
    throw new Error(
      "Farmer location is required for shipment"
    );
  }

  // Prevent duplicate shipment creation
  const existingShipment = await Shipment.findOne({
    orderId: order._id,
  });

  if (existingShipment) {
    console.log(
      `🚚 Shipment already exists for order ${order._id}`
    );

    return existingShipment;
  }

  console.log("🤖 Calling Logistics Agent...");

  const response = await axios.post(
    `${AGENTS_URL}/logistics/assign`,
    {
      farmerLat,
      farmerLng,
      quantity: Number(order.quantity),
      cropName: order.cropName,
    },
    {
      timeout: 30000,
    }
  );

  const result = response.data;

  if (
    !result ||
    result.success !== true ||
    !result.vehicle
  ) {
    throw new Error(
      result?.reason ||
        "Logistics Agent could not assign a vehicle"
    );
  }

  const vehicle = result.vehicle;

  // Backend validation
  if (vehicle.available !== true) {
    throw new Error(
      "Selected vehicle is unavailable"
    );
  }

  if (Number(order.quantity) > Number(vehicle.capacityKg)) {
  throw new Error(
    "Selected vehicle cannot carry the order quantity"
  );
}
  const scheduledPickupAt = computePickupDate(
    Number(vehicle.distanceKm)
  );

  const shipment = await Shipment.create({
    orderId: order._id,

    companyId: order.companyId,

    farmerId: order.farmerId,

    vehicle: {
      vehicleId: vehicle.vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.type,
      capacityKg: Number(vehicle.capacityKg),
      driverName: vehicle.driverName,
      driverContact: vehicle.driverContact,
    },

    pickup: {
      lat: farmerLat,
      lng: farmerLng,
      address: farmer.address,
      scheduledAt: scheduledPickupAt,
    },

    vehicleLocation: {
      lat: Number(vehicle.lat),
      lng: Number(vehicle.lng),
    },

    distanceKm: Number(vehicle.distanceKm),

    quantityKg: Number(order.quantity),

    status: "assigned",

    logisticsAgent: {
      agent: result.agent || "logistics",

      reason:
        result.reason ||
        "Vehicle selected by Logistics Agent.",

      confidence: Number(
        result.confidence || 0
      ),

      assignedAt: new Date(),
    },
  });

  console.log(
    `🤖 Logistics Agent selected ${vehicle.vehicleId}`
  );

  console.log(
    `🚚 Vehicle: ${vehicle.vehicleNumber}`
  );

  console.log(
    `📦 Capacity: ${vehicle.capacityKg} kg`
  );

  console.log(
    `📍 Distance: ${vehicle.distanceKm} km`
  );

  console.log(
    `📅 Pickup scheduled: ${scheduledPickupAt.toISOString()}`
  );

  return shipment;
}