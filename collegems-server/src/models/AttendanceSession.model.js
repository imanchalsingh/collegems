import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    /** Hex secret used for 5-second TOTP QR rotation (teacher-facing only). */
    totpSecret: {
      type: String,
      required: true,
      select: false,
    },
    totpPeriodSeconds: {
      type: Number,
      default: 5,
      min: 5,
      max: 60,
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
      index: true,
    },
    /** Classroom geofence center (required for geo-bound sessions). */
    geo: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      radiusMeters: { type: Number, default: 100, min: 10, max: 2000 },
    },
    startedAt: { type: Date, default: Date.now },
    endsAt: { type: Date },
    endedAt: { type: Date },
    /** Anti-proxy: first successful device fingerprint per student in this session. */
    deviceBindings: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        fingerprint: { type: String, required: true },
        boundAt: { type: Date, default: Date.now },
      },
    ],
    markedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ teacher: 1, status: 1, createdAt: -1 });
attendanceSessionSchema.index({ course: 1, date: 1, status: 1 });

export default mongoose.models.AttendanceSession ||
  mongoose.model("AttendanceSession", attendanceSessionSchema);
