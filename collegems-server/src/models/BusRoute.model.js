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
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 },
        /** Geo-fence radius in meters for approach alerts (default 1000 m). */
        radiusM: { type: Number, default: 1000, min: 50, max: 5000 },
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
    /** Latest live GPS snapshot for quick map hydrate. */
    lastKnownLocation: {
      lat: Number,
      lng: Number,
      speedKmh: Number,
      heading: Number,
      recordedAt: Date,
      routeDeviation: Boolean,
      etaMinutesToNextStop: Number,
      nearestStopName: String,
    },
    /** Soft corridor radius (m) used for route-deviation warnings. */
    corridorRadiusM: {
      type: Number,
      default: 800,
      min: 100,
      max: 5000,
    },
  },
  { timestamps: true }
);

export default mongoose.model("BusRoute", busRouteSchema);
