import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: String,
    rollNumber: String,
    department: String,
  },
  { _id: false }
);

const hallSeatGroupSchema = new mongoose.Schema(
  {
    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamHall",
      required: true,
    },
    hallName: String,
    seats: [seatSchema],
  },
  { _id: false }
);

const hallAllocationSchema = new mongoose.Schema(
  {
    examSchedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSchedule",
      required: true,
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    strategy: {
      type: String,
      enum: ["sequential", "department-mixed", "zigzag"],
      default: "department-mixed",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    totalHalls: {
      type: Number,
      default: 0,
    },
    allocations: [hallSeatGroupSchema],
    warnings: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

hallAllocationSchema.index({ examSchedule: 1, status: 1 });

export default mongoose.model("HallAllocation", hallAllocationSchema);
