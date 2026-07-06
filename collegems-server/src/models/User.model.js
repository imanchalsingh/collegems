import mongoose from "mongoose";
import timelinePlugin from "../plugins/timelinePlugin.js";
import snapshotPlugin from "../plugins/snapshotPlugin.js";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher", "parent", "hod", "alumni"], required: true },
  phone: { type: String },

  // Telemetry & Account Status
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  accountStatus: { type: String, enum: ["active", "archived", "suspended"], default: "active" },

  // Email Verification
  isEmailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },

  // Password Reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // Tags
  tags: {
    type: [String],
    default: [],
  },

  // File attachments
  resumeUrl: { type: String },

  // Parent-specific fields
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: function () {
      return this.role === "parent";
    },
  },

  // Student/Alumni-specific fields
  studentId: { type: String },
  academicRecordLocked: {
    type: Boolean,
    default: false,
  },
  semester: {
    type: String,
    required: function () {
      return this.role === "student";
    },
  },
  course: {
    type: String,
    required: function () {
      return this.role === "student";
    },
  },


  // Teacher-specific
  branch: { type: String },
  section: { type: String },
  teacherId: { type: String },
  department: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
  },
  bio: { type: String },
  officeHours: { type: String },
  unavailableTimeSlots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "TimeSlot"
  }],


  // HOD-specific
  departmentCode: { type: String },

  settings: {
    preferences: {
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
      digestFrequency: { type: String, default: "weekly" },
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
    },
  },

  transferHistory: [
  {
    field: { type: String }, // which field changed
    previousValue: { type: String },
    newValue: { type: String },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }
],
}, { timestamps: true });

userSchema.index({ name: "text", email: "text", studentId: "text", teacherId: "text" });

userSchema.plugin(timelinePlugin, {
  trackedFields: ["course", "semester", "phone", "email"]
});

userSchema.plugin(snapshotPlugin);

export default mongoose.model("User", userSchema);
