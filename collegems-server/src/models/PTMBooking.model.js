import mongoose from "mongoose";

const actionItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const ptmBookingSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 15,
      max: 120,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    meetingRoomId: {
      type: String,
      required: true,
    },
    meetingUrl: {
      type: String,
    },
    teacherNotes: {
      type: String,
      default: "",
      maxlength: 5000,
    },
    actionItems: [actionItemSchema],
    rejectionReason: {
      type: String,
      default: "",
    },
    reminderSentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

ptmBookingSchema.index({ teacher: 1, scheduledAt: 1, status: 1 });
ptmBookingSchema.index({ parent: 1, scheduledAt: -1 });

export default mongoose.model("PTMBooking", ptmBookingSchema);
