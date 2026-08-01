import mongoose from "mongoose";

const weeklySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    location: { type: String, default: "" },
    isOnline: { type: Boolean, default: false },
  },
  { _id: false }
);

const mentorshipAvailabilitySchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    slots: [weeklySlotSchema],
    slotDurationMin: {
      type: Number,
      default: 30,
      min: 15,
      max: 120,
    },
    notes: { type: String, default: "", maxlength: 1000 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("MentorshipAvailability", mentorshipAvailabilitySchema);
