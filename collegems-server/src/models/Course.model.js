import mongoose from "mongoose";
import ownershipPlugin from "../plugins/ownershipPlugin.js";

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    department: {
      type: String,
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    credits: {
      type: Number,
      default: 3,
    },
    description: {
      type: String,
    },
    maxStudents: {
      type: Number,
      default: 60,
    },
    isLab: {
      type: Boolean,
      default: false,
    },
    targetBatch: {
      type: String,
      default: "General",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

courseSchema.index({ name: "text", code: "text", department: "text" });

courseSchema.pre(/^find/, function () {
  if (this.getOptions().includeDeleted) {
    return;
  }
  this.where({ isDeleted: { $ne: true } });
});

courseSchema.pre('countDocuments', function() {
  if (this.getOptions().includeDeleted) {
    return;
  }
  this.where({ isDeleted: { $ne: true } });
});

courseSchema.plugin(ownershipPlugin);

export default mongoose.model("Course", courseSchema);
