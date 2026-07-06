import mongoose from "mongoose";

const formAbandonmentSchema = new mongoose.Schema(
  {
    formId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    lastCompletedField: {
      type: String,
      default: null,
    },
    completionPercentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["abandoned", "submitted", "in_progress"],
      default: "in_progress",
      index: true,
    },
  },
  { timestamps: true }
);

// Optional: Automatically mark stale forms as abandoned after e.g. 1 hour,
// but for simplicity we rely on the client to send the "abandoned" heartbeat 
// on unmount/beforeunload, or a cron job. The client logic covers most cases.

export default mongoose.model("FormAbandonment", formAbandonmentSchema);
