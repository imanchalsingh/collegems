import mongoose from "mongoose";

const performanceDiscussionSchema = new mongoose.Schema({
  mentorship: { type: mongoose.Schema.Types.ObjectId, ref: "Mentorship", required: true },
  academicProgress: { type: String, required: true },
  strengths: { type: String },
  areasForImprovement: { type: String },
  goals: { type: String },
  recommendations: { type: String },
  plannedFollowUp: { type: Date },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("PerformanceDiscussion", performanceDiscussionSchema);
