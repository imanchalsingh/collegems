import mongoose from "mongoose";

const jobPostingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    type: { type: String, enum: ["Internship", "Full-time", "Part-time"], required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    location: { type: String },
    salary: { type: String },
    deadline: { type: Date, required: true },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

export default mongoose.model("JobPosting", jobPostingSchema);
