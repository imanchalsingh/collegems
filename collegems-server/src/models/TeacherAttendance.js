// models/TeacherAttendance.js
import mongoose from "mongoose";

const TeacherAttendanceSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

TeacherAttendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });

const TeacherAttendance = mongoose.model("TeacherAttendance", TeacherAttendanceSchema);
export default TeacherAttendance;