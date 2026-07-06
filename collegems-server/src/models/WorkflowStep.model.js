import mongoose from "mongoose";

const workflowStepSchema = new mongoose.Schema(
  {
    workflowDef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkflowDef",
      required: true,
    },
    stepId: {
      type: String,
      required: true,
      trim: true,
      // Used internally by the DAG (e.g., "step_1")
    },
    stepName: {
      type: String,
      required: true,
      trim: true,
      // e.g., "HOD Approval"
    },
    approverRole: {
      type: String,
      // The role required to approve this step (e.g., "hod", "principal", "admin")
      // If null, we might rely on specific approverUser
    },
    approverUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Specific user to approve, if not using role
    },
    isInitial: {
      type: Boolean,
      default: false,
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
    onApproveNextStepId: {
      type: String,
      // stepId of the next node in the DAG if approved
    },
    onRejectNextStepId: {
      type: String,
      // stepId of the next node in the DAG if rejected
    },
  },
  { timestamps: true }
);

// Prevent duplicate stepIds within the same workflow definition
workflowStepSchema.index({ workflowDef: 1, stepId: 1 }, { unique: true });

export default mongoose.model("WorkflowStep", workflowStepSchema);
