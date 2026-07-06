import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    achievementDate: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      enum: ["award", "hackathon", "publication", "conference", "competition", "certification", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["submitted", "pending", "approved", "rejected"],
      default: "submitted",
    },
    proofDocuments: [
      {
        filename: String,
        url: String,
        originalName: String,
        mimeType: String,
        size: Number,
      },
    ],
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
    },
    approvalDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Achievement", achievementSchema);
