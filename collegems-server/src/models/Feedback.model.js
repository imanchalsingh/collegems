// FILE: collegems-server/src/models/Feedback.model.js
// NEW FILE — create this in your models/ folder

import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    // Who submitted (null if anonymous)
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // What the feedback is about
    category: {
      type: String,
      enum: ["course", "faculty", "facility", "general"],
      required: true,
    },

    // Optional: link to a specific course or teacher
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // The actual feedback
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // 1–5 star rating (optional)
    rating: { type: Number, min: 1, max: 5, default: null },

    // Was this submitted anonymously?
    isAnonymous: { type: Boolean, default: false },

    // HOD/admin status management
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },

    // HOD can add a response
    adminResponse: { type: String, default: "" },

    // Sentiment Analysis properties
    sentiment: {
      type: String,
      enum: ["Positive", "Neutral", "Negative", "Unanalyzed"],
      default: "Unanalyzed",
    },
    sentimentScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
