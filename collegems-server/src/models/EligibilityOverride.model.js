import mongoose from "mongoose";

const eligibilityOverrideSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  module: { type: String, required: true, enum: ['ExamForm', 'Library', 'Placement', 'Event', 'StudyGroup'] },
  authorizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("EligibilityOverride", eligibilityOverrideSchema);
