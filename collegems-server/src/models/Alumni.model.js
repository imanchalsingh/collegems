import mongoose from "mongoose";

const alumniSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  batch: { type: String, required: true }, // e.g. "2020", "2021"
  department: { type: String, required: true }, // e.g. "Computer Science", "Electrical Engineering"
  currentCompany: { type: String },
  designation: { type: String },
  linkedInUrl: { type: String },
  skills: [{ type: String }],
  achievements: { type: String },
  experience: { type: String },
  isVerified: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Alumni", alumniSchema);
