import mongoose from "mongoose";

const conditionSchema = new mongoose.Schema(
  {
    field: { type: String, trim: true },
    operator: {
      type: String,
      enum: ["eq", "neq", "ne", "gt", "gte", "lt", "lte", "contains"],
      default: "eq",
    },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

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
    },
    stepName: {
      type: String,
      required: true,
      trim: true,
    },
    /** Canvas node kind: Start → Approval → Condition → Action */
    nodeType: {
      type: String,
      enum: ["start", "approval", "condition", "action"],
      default: "approval",
    },
    approverRole: {
      type: String,
    },
    approverUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isInitial: {
      type: Boolean,
      default: false,
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
    condition: conditionSchema,
    /** Final status when an action node completes without a next edge. */
    actionOutcome: {
      type: String,
      enum: ["Approved", "Rejected"],
      default: "Approved",
    },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    onApproveNextStepId: String,
    onRejectNextStepId: String,
    onTrueNextStepId: String,
    onFalseNextStepId: String,
  },
  { timestamps: true }
);

workflowStepSchema.index({ workflowDef: 1, stepId: 1 }, { unique: true });

export default mongoose.model("WorkflowStep", workflowStepSchema);
