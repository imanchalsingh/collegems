import mongoose from "mongoose";

const workflowAuditLogSchema = new mongoose.Schema(
  {
    workflowInstance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkflowInstance",
      required: true,
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    step: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkflowStep",
      // Might be null if the action is just starting the workflow
    },
    action: {
      type: String,
      enum: ["Started", "Approved", "Rejected", "Commented"],
      required: true,
    },
    comments: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("WorkflowAuditLog", workflowAuditLogSchema);
