import mongoose from "mongoose";

const recentHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  entityType: {
    type: String,
    required: true,
    enum: ["Course", "User", "Student", "Faculty", "Event", "Timetable", "Assignment", "Club", "Announcement", "Other"],
  },
  entityId: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  viewedAt: {
    type: Date,
    default: Date.now,
  },
});

recentHistorySchema.index({ user: 1, viewedAt: -1 });
recentHistorySchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });

export default mongoose.model("RecentHistory", recentHistorySchema);
