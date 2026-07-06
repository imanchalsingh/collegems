import mongoose from "mongoose";

const formFieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., 'leaveType'
  label: { type: String, required: true }, // e.g., 'Leave Type'
  type: {
    type: String,
    enum: ["text", "textarea", "number", "date", "select", "checkbox", "file"],
    required: true,
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // For 'select' or 'checkbox' types
  validationRules: {
    min: Number,
    max: Number,
    pattern: String,
  },
});

const formTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fields: [formFieldSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FormTemplate", formTemplateSchema);
