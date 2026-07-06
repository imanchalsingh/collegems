// FILE: collegems-server/src/controllers/feedback.controller.js
// REPLACE your existing file with this.
// Fix: anonymous submissions now store studentId separately so
//      the student can still see their own anonymous submissions.

import Feedback from "../models/Feedback.model.js";
import { analyzeFeedbackSentiment } from "../services/analytics.service.js";

// ── Student: submit feedback ──────────────────────────────────────────────────
// POST /api/feedback
export const submitFeedback = async (req, res) => {
  try {
    const { category, title, message, rating, isAnonymous, courseId, teacherId } = req.body;

    if (!category || !title || !message) {
      return res
        .status(400)
        .json({ message: "Category, title and message are required." });
    }

    const feedback = await Feedback.create({
      // Always store the real student id so the student can fetch their own
      // submissions. isAnonymous just controls whether HOD can see the name.
      student: req.user.id,
      category,
      title,
      message,
      rating: rating ? Number(rating) : null,
      isAnonymous: Boolean(isAnonymous),
      course: courseId || null,
      teacher: teacherId || null,
    });

    // Run sentiment analysis asynchronously without blocking the response
    analyzeFeedbackSentiment(feedback._id, feedback.message).then(async (result) => {
        feedback.sentiment = result.sentiment;
        feedback.sentimentScore = result.sentiment_score;
        await feedback.save();
    }).catch(err => console.error("Error analyzing sentiment post-creation:", err));

    res.status(201).json({ message: "Feedback submitted successfully.", feedback });
  } catch (error) {
    console.error("submitFeedback error:", error);
    res.status(500).json({ message: "Failed to submit feedback." });
  }
};

// ── Student: get their own feedback history ───────────────────────────────────
// GET /api/feedback/my
export const getMyFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ student: req.user.id })
      .populate("course", "name code")
      .populate("teacher", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(feedbacks);
  } catch (error) {
    console.error("getMyFeedback error:", error);
    res.status(500).json({ message: "Failed to fetch your feedback." });
  }
};

// ── HOD: get all feedback with filters ───────────────────────────────────────
// GET /api/feedback/all?category=course&status=pending
export const getAllFeedback = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status)   filter.status   = status;

    const feedbacks = await Feedback.find(filter)
      .populate("student", "name email studentId")
      .populate("course",  "name code")
      .populate("teacher", "name")
      .sort({ createdAt: -1 })
      .lean();

    // For anonymous submissions, hide student info from HOD
    const sanitized = feedbacks.map((f) => ({
      ...f,
      student: f.isAnonymous ? null : f.student,
    }));

    res.json(sanitized);
  } catch (error) {
    console.error("getAllFeedback error:", error);
    res.status(500).json({ message: "Failed to fetch feedback." });
  }
};

// ── HOD: get analytics summary ────────────────────────────────────────────────
// GET /api/feedback/analytics
export const getFeedbackAnalytics = async (req, res) => {
  try {
    const total     = await Feedback.countDocuments();
    const pending   = await Feedback.countDocuments({ status: "pending" });
    const reviewed  = await Feedback.countDocuments({ status: "reviewed" });
    const resolved  = await Feedback.countDocuments({ status: "resolved" });
    const anonymous = await Feedback.countDocuments({ isAnonymous: true });

    const categoryBreakdown = await Feedback.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    const sentimentBreakdown = await Feedback.aggregate([
      {
        $group: {
          _id: "$sentiment",
          count: { $sum: 1 },
        },
      },
    ]);

    const ratingResult = await Feedback.aggregate([
      { $match: { rating: { $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const avgRating = ratingResult[0]?.avgRating?.toFixed(1) || null;

    const recentPending = await Feedback.find({ status: "pending" })
      .populate("student", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      total, pending, reviewed, resolved, anonymous,
      avgRating, categoryBreakdown, sentimentBreakdown, recentPending,
    });
  } catch (error) {
    console.error("getFeedbackAnalytics error:", error);
    res.status(500).json({ message: "Failed to fetch analytics." });
  }
};

// ── HOD: update status + add response ────────────────────────────────────────
// PATCH /api/feedback/:id
export const updateFeedbackStatus = async (req, res) => {
  try {
    const { status, adminResponse } = req.body;

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found." });

    if (status) feedback.status = status;
    if (adminResponse !== undefined) feedback.adminResponse = adminResponse;

    await feedback.save();
    res.json({ message: "Feedback updated.", feedback });
  } catch (error) {
    console.error("updateFeedbackStatus error:", error);
    res.status(500).json({ message: "Failed to update feedback." });
  }
};

// ── HOD: delete feedback ──────────────────────────────────────────────────────
// DELETE /api/feedback/:id
export const deleteFeedback = async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: "Feedback deleted." });
  } catch (error) {
    console.error("deleteFeedback error:", error);
    res.status(500).json({ message: "Failed to delete feedback." });
  }
};

import { batchAnalyzeSentiments } from "../services/analytics.service.js";

// ── HOD: batch analyze all unanalyzed feedback ────────────────────────────────
// POST /api/feedback/analyze-all
export const batchAnalyze = async (req, res) => {
  try {
    // Run asynchronously
    batchAnalyzeSentiments();
    res.json({ message: "Batch sentiment analysis job started." });
  } catch (error) {
    console.error("batchAnalyze error:", error);
    res.status(500).json({ message: "Failed to start batch analysis." });
  }
};
