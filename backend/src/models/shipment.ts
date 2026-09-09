import mongoose, { Schema, Document } from "mongoose";

export type ShipmentStatus =
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface IShipment extends Document {
  orderId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  farmerId: mongoose.Types.ObjectId;

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

  vehicleLocation?: {
    lat: number;
    lng: number;
  };

  distanceKm?: number;

  quantityKg: number;

  status: ShipmentStatus;

  logisticsAgent: {
    agent: string;
    reason: string;
    confidence: number;
    assignedAt: Date;
  };

  pickedUpAt?: Date;
  inTransitAt?: Date;
  deliveredAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const shipmentSchema = new Schema<IShipment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    farmerId: {
      type: Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
      index: true,
    },

    vehicle: {
      vehicleId: {
        type: String,
        required: true,
      },

      vehicleNumber: {
        type: String,
        required: true,
      },

      vehicleType: {
        type: String,
        required: true,
      },

      capacityKg: {
        type: Number,
        required: true,
      },

      driverName: {
        type: String,
        required: true,
      },

      driverContact: {
        type: String,
        required: true,
      },
    },

    pickup: {
      lat: {
        type: Number,
        required: true,
      },

      lng: {
        type: Number,
        required: true,
      },

      address: {
        type: String,
      },
    },

    vehicleLocation: {
      lat: {
        type: Number,
      },

      lng: {
        type: Number,
      },
    },

    distanceKm: {
      type: Number,
    },

    quantityKg: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      default: "assigned",
    },

    logisticsAgent: {
      agent: {
        type: String,
        default: "logistics",
      },

      reason: {
        type: String,
        required: true,
      },

      confidence: {
        type: Number,
        required: true,
      },

      assignedAt: {
        type: Date,
        default: Date.now,
      },
    },

    pickedUpAt: {
      type: Date,
    },

    inTransitAt: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IShipment>("Shipment", shipmentSchema);