import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // e.g. "Spring 2026 CS Dept"
    },
    department: {
      type: String,
    },
    semester: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "failed"],
      default: "pending",
    },
    conflictReport: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    generationTimeMs: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Timetable", timetableSchema);
