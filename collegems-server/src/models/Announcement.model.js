// FILE: collegems-server/src/models/Announcement.model.js

import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Who posted the announcement
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Audience filters - all are optional; absence means "all"
    targetRole: {
      type: String,
      enum: ["all", "student", "teacher", "hod", "parent"],
      default: "all",
    },

    targetCourse: {
      type: String,
      enum: ["BCA", "MCA", "BBA", "MBA", null],
      default: null, // null = all COURSES
    },

    targetSemester: {
      type: String,
      trim: true,
      default: null, // null = all semesters
    },

    // TODO: Add targetClub after club/society management is implemented.



    // Announcements auto-hide after this
    expiresAt: {
      type: Date,
      default: null,
    },

    // Priority badge shown in UI
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isSilent: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true }
);

// Index for fast audience queries
AnnouncementSchema.index({ status: 1, targetRole: 1, targetCourse: 1, targetSemester: 1 });
AnnouncementSchema.index({ title: "text", message: "text" });

const Announcement = mongoose.model("Announcement", AnnouncementSchema);

export default Announcement;
