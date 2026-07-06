import mongoose from "mongoose";

const dataLockWindowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Lock window name is required"],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
    affectedModules: [
      {
        type: String,
        enum: ["results", "attendance", "assignments", "courses", "all"],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DataLockWindow", dataLockWindowSchema);
