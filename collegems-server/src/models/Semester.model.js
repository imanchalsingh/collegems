import mongoose from "mongoose";

const SemesterSchema = new mongoose.Schema(
  {
    semester: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
    frozenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    /**
     * isActive – true for the single currently-open academic session.
     * Only one semester should have isActive=true at a time.
     * When a new session is activated, all others are automatically set
     * to isActive=false and isFrozen=true (read-only).
     */
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Timestamp when this session was set as the active session. */
    activatedAt: {
      type: Date,
      default: null,
    },
    /** Timestamp when this session was automatically deactivated (closed). */
    deactivatedAt: {
      type: Date,
      default: null,
    },
    /** The user who activated this session. */
    activatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Semester", SemesterSchema);

