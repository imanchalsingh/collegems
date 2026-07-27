import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      default: "incomplete_profile",
    },
    status: {
      type: String,
      enum: ["queued", "processing", "sent", "failed"],
      default: "queued",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Reminder", reminderSchema);