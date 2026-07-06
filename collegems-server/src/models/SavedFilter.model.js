import mongoose from "mongoose";

const savedFilterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dashboard: {
      type: String,
      required: true,
      trim: true,
      index: true, // Useful for querying specific dashboards
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

// Optional: Ensure a user can't have duplicate filter names on the same dashboard
savedFilterSchema.index({ user: 1, dashboard: 1, name: 1 }, { unique: true });

export default mongoose.model("SavedFilter", savedFilterSchema);
