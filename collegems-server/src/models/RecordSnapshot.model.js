import mongoose from "mongoose";

const recordSnapshotSchema = new mongoose.Schema(
  {
    collectionName: {
      type: String,
      required: true,
      index: true,
    },
    modelName: {
      type: String,
      required: true,
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    operation: {
      type: String,
      enum: ["update", "delete", "replace"],
      required: true,
    },
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 30 * 24 * 60 * 60, // 30 days retention policy (TTL index)
    },
  },
  { timestamps: false }
);

export default mongoose.model("RecordSnapshot", recordSnapshotSchema);
