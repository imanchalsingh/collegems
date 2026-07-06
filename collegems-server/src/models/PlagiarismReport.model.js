import mongoose from "mongoose";

// One match against another submission (same assignment or a previous year's)
const matchSchema = new mongoose.Schema(
  {
    matchType: {
      type: String,
      enum: ["same_assignment", "previous_year"],
      required: true,
    },
    // The assignment that the matched submission belongs to
    sourceAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    sourceAssignmentTitle: { type: String },
    // The student who wrote the matched submission
    matchedStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    matchedStudentName: { type: String },
    academicYear: { type: String }, // derived from the matched submission's createdAt
    similarityPercentage: { type: Number, required: true }, // 0-100
    // Up to a few representative overlapping text excerpts
    matchedSections: [
      {
        excerpt: { type: String },
        similarity: { type: Number }, // 0-100, local similarity for this excerpt
      },
    ],
  },
  { _id: false }
);

const plagiarismReportSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Source type of the analyzed submission: file (pdf/doc/etc), text, or link
    sourceType: {
      type: String,
      enum: ["file", "text", "link", "none"],
      default: "none",
    },
    // How much usable text was extracted (for transparency in the UI)
    extractedCharacterCount: { type: Number, default: 0 },
    overallSimilarity: { type: Number, default: 0 }, // highest match %, 0-100
    threshold: { type: Number, default: 40 }, // similarity % that triggers a flag
    flagged: { type: Boolean, default: false },
    matches: [matchSchema],
    status: {
      type: String,
      enum: ["pending_review", "reviewed", "cleared", "action_taken"],
      default: "pending_review",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewNotes: { type: String, default: "" },
    reviewedAt: { type: Date },
    checkedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One report per (assignment, student) — re-running a check overwrites it
plagiarismReportSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model("PlagiarismReport", plagiarismReportSchema);
