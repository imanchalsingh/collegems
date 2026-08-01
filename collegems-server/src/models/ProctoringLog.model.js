import mongoose from "mongoose";

const violationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "tab_switch",
        "window_blur",
        "missing_face",
        "multiple_faces",
        "camera_blocked",
        "fullscreen_exit",
      ],
      required: true,
    },
    message: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const proctoringLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentName: { type: String },
    quizTitle: { type: String },
    violations: { type: [violationSchema], default: [] },
    warningCount: { type: Number, default: 0 },
    maxWarnings: { type: Number, default: 3 },
    maxViolations: { type: Number, default: 8 },
    status: {
      type: String,
      enum: ["active", "completed", "auto_submitted", "aborted"],
      default: "active",
    },
    autoSubmitted: { type: Boolean, default: false },
    faceDetectionEnabled: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    lastFaceCount: { type: Number, default: 1 },
  },
  { timestamps: true },
);

proctoringLogSchema.index({ quiz: 1, student: 1, startedAt: -1 });

export default mongoose.models.ProctoringLog ||
  mongoose.model("ProctoringLog", proctoringLogSchema);
