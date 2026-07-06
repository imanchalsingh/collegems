import mongoose from "mongoose";

const meetingLogSchema = new mongoose.Schema({
  mentorship: { type: mongoose.Schema.Types.ObjectId, ref: "Mentorship", required: true },
  date: { type: Date, required: true },
  discussionSummary: { type: String, required: true },
  actionItems: [{ type: String }],
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model("MeetingLog", meetingLogSchema);
