import mongoose from "mongoose";

const mentorshipSchema = new mongoose.Schema({
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mentee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  assignedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("Mentorship", mentorshipSchema);
