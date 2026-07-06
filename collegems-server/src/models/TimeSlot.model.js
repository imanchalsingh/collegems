import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    startTime: {
      type: String, // format HH:mm
      required: true,
    },
    endTime: {
      type: String, // format HH:mm
      required: true,
    },
    isBreak: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent duplicate timeslots on the same day
timeSlotSchema.index({ dayOfWeek: 1, startTime: 1, endTime: 1 }, { unique: true });

export default mongoose.model("TimeSlot", timeSlotSchema);
