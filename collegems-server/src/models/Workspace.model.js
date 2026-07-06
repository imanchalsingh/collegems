import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
      required: true,
      unique: true,
    },
    // We store the Yjs binary update as a Buffer
    documentState: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Workspace", workspaceSchema);
