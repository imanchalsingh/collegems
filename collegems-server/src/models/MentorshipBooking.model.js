import mongoose from "mongoose";

const mentorshipBookingSchema = new mongoose.Schema(
  {
    mentorship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentorship",
      required: true,
      index: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    purpose: { type: String, default: "", maxlength: 500 },
    location: { type: String, default: "" },
    isOnline: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed",
      index: true,
    },
    rating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: "", maxlength: 1000 },
      ratedAt: { type: Date },
    },
    calendarInviteSentAt: { type: Date },
  },
  { timestamps: true }
);

mentorshipBookingSchema.index({ mentor: 1, startTime: 1, endTime: 1, status: 1 });
mentorshipBookingSchema.index({ mentee: 1, startTime: -1 });

export default mongoose.model("MentorshipBooking", mentorshipBookingSchema);
