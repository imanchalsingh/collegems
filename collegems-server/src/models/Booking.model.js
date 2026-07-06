import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Optional: Add index to optimize conflict queries
bookingSchema.index({ resource: 1, startTime: 1, endTime: 1 });

export default mongoose.model("Booking", bookingSchema);
