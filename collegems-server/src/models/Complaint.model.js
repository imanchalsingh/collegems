import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const escalationEventSchema = new mongoose.Schema(
  {
    fromLevel: { type: Number, required: true },
    toLevel: { type: Number, required: true },
    fromHandler: { type: String },
    toHandler: { type: String, required: true },
    reason: { type: String, default: "SLA deadline expired" },
    escalatedAt: { type: Date, default: Date.now },
    notifiedEmails: [{ type: String }],
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    student: {
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
    category: {
      type: String,
      enum: [
        "Academic",
        "Hostel",
        "Transport",
        "Technical",
        "Administration",
        "Ragging",
        "Infrastructure",
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Submitted", "Under Review", "In Progress", "Resolved", "Closed"],
      default: "Submitted",
    },
    evidenceUrl: {
      type: String,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolutionNotes: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
    comments: [commentSchema],

    // SLA & escalation matrix
    slaDeadline: {
      type: Date,
    },
    slaBreached: {
      type: Boolean,
      default: false,
    },
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    currentHandlerRole: {
      type: String,
      default: "Admin Officer",
    },
    escalationHistory: [escalationEventSchema],
    lastEscalatedAt: {
      type: Date,
    },

    // Anonymous reporting
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    anonymousTrackingId: {
      type: String,
      index: true,
    },
    trackingIdHash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

complaintSchema.index({ status: 1, slaDeadline: 1 });
complaintSchema.index({ escalationLevel: 1, status: 1 });

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
