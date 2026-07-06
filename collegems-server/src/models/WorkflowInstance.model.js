import mongoose from "mongoose";

const workflowInstanceSchema = new mongoose.Schema(
  {
    workflowDef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkflowDef",
      required: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    formData: {
      type: mongoose.Schema.Types.Mixed, // Stores the JSON submitted by the user
      required: true,
    },
    currentStep: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkflowStep",
      // If null and status is not pending, it implies completion
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Draft"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("WorkflowInstance", workflowInstanceSchema);
