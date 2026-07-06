import mongoose from "mongoose";

const busRouteSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    busNumber: {
      type: String,
      required: true,
      trim: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    driverPhone: {
      type: String,
      trim: true,
    },
    stops: [
      {
        stopName: { type: String, required: true },
        arrivalTime: { type: String, required: true },
      },
    ],
    schedule: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["active", "delayed", "inactive"],
      default: "active",
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("BusRoute", busRouteSchema);
