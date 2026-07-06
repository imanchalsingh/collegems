import mongoose from "mongoose";

const attendanceAlertSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course"
    },
    alertType: {
      type: String,
      enum: ["CONSECUTIVE_ABSENCE", "MISSING_RECORDS"],
      required: true
    },
    severity: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium"
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active"
    },
    lastDetectedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("AttendanceAlert", attendanceAlertSchema);
