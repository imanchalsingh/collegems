// FILE: collegems-server/src/models/AnnouncementRead.model.js
import mongoose from "mongoose";

const AnnouncementReadSchema = new mongoose.Schema(
  {
    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

AnnouncementReadSchema.index({ announcement: 1, user: 1 }, { unique: true });

AnnouncementReadSchema.index({ announcement: 1 });

const AnnouncementRead = mongoose.model(
  "AnnouncementRead",
  AnnouncementReadSchema
);

export default AnnouncementRead;
