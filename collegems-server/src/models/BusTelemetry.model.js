import mongoose from "mongoose";

/**
 * Live GPS sample for a college bus (#706).
 * Latest position is also denormalized onto BusRoute for fast map hydrate.
 */
const busTelemetrySchema = new mongoose.Schema(
  {
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusRoute",
      required: true,
      index: true,
    },
    busNumber: {
      type: String,
      trim: true,
      index: true,
    },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    speedKmh: { type: Number, default: 0, min: 0 },
    heading: { type: Number, min: 0, max: 360 },
    accuracyM: { type: Number, min: 0 },
    recordedAt: { type: Date, default: Date.now, index: true },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    /** True when current position is outside corridor of planned stop polyline. */
    routeDeviation: { type: Boolean, default: false },
    nearestStopName: String,
    nearestStopDistanceM: Number,
    etaMinutesToNextStop: Number,
  },
  { timestamps: true }
);

// Keep recent trail; TTL ~ 7 days
busTelemetrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
busTelemetrySchema.index({ route: 1, recordedAt: -1 });

export default mongoose.models.BusTelemetry ||
  mongoose.model("BusTelemetry", busTelemetrySchema);
