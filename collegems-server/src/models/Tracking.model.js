import mongoose from "mongoose";

const trackingSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["Student", "Course", "Department"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

trackingSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

export default mongoose.model("Tracking", trackingSchema);
