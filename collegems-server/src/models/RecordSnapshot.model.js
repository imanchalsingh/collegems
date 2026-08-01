import mongoose from "mongoose";

const fieldDiffSchema = new mongoose.Schema(
  {
    path: String,
    type: {
      type: String,
      enum: ["added", "deleted", "modified"],
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

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
      index: true,
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    /** Document state BEFORE the write (point-in-time restore source). */
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    /** Best-effort document state AFTER the write (for side-by-side diff). */
    afterData: {
      type: mongoose.Schema.Types.Mixed,
    },
    /** Raw jsondiffpatch delta. */
    delta: {
      type: mongoose.Schema.Types.Mixed,
    },
    /** Flattened field rows for UI (Red = deleted, Green = added). */
    fieldDiffs: {
      type: [fieldDiffSchema],
      default: [],
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
    actorRole: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 30 * 24 * 60 * 60, // 30 days retention (TTL)
    },
  },
  { timestamps: false }
);

recordSnapshotSchema.index({ modelName: 1, recordId: 1, createdAt: -1 });

export default mongoose.model("RecordSnapshot", recordSnapshotSchema);
