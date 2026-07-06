import mongoose from "mongoose";

const placementDriveSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    role: { type: String, required: true },
    description: { type: String },
    eligibility: {
      minCGPA: { type: Number, default: 0 },
      maxBacklogs: { type: Number, default: 0 },
      allowedBranches: [{ type: String }],
      graduationYear: { type: Number },
    },
    driveDate: { type: Date },
    lastDateToApply: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "closed"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlacementDrive", placementDriveSchema);