import mongoose from "mongoose";

const workflowDefSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Leave",
        "Outpass",
        "Event",
        "Requisition",
        "General",
        "FeeConcession",
        "Bonafide",
      ],
      default: "General",
    },
    description: {
      type: String,
      trim: true,
    },
    formTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    /** Visual React Flow layout (nodes/edges) for the drag-and-drop builder. */
    graphMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("WorkflowDef", workflowDefSchema);
