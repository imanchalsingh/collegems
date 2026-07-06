import mongoose from "mongoose";

const studentConcernSchema = new mongoose.Schema({
  mentorship: { type: mongoose.Schema.Types.ObjectId, ref: "Mentorship", required: true },
  type: { type: String, enum: ["academic", "personal", "administrative"], required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["open", "resolved"], default: "open" },
  dateReported: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("StudentConcern", studentConcernSchema);
