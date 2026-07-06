import mongoose from "mongoose";

const documentVersionSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
      required: true,
    },
    versionName: {
      type: String,
      default: "Auto-saved Version",
    },
    documentState: {
      type: Buffer,
      required: true,
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DocumentVersion", documentVersionSchema);
