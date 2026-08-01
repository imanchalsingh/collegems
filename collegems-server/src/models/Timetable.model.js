import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
    solver: {
      type: String,
      enum: ["local", "genetic"],
      default: "local",
    },
    fitnessScore: {
      type: Number,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.models.Timetable ||
  mongoose.model("Timetable", timetableSchema);
