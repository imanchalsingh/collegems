import FormAbandonment from "../models/FormAbandonment.model.js";
import mongoose from "mongoose";

// Start a form session
export const startFormSession = async (req, res) => {
  try {
    const { formId } = req.body;
    if (!formId) {
      return res.status(400).json({ success: false, message: "formId is required" });
    }

    const session = await FormAbandonment.create({
      formId,
      userId: req.user.id,
      status: "in_progress",
    });

    res.status(201).json({ success: true, sessionId: session._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update heartbeat / field progress
export const updateFormSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { lastCompletedField, completionPercentage, status } = req.body;

    const session = await FormAbandonment.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Don't overwrite if it's already submitted
    if (session.status === "submitted") {
      return res.status(200).json({ success: true });
    }

    if (lastCompletedField !== undefined) session.lastCompletedField = lastCompletedField;
    if (completionPercentage !== undefined) session.completionPercentage = completionPercentage;
    if (status !== undefined) session.status = status;
    session.lastActiveAt = new Date();

    await session.save();

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark as submitted
export const submitFormSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await FormAbandonment.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    session.status = "submitted";
    session.completionPercentage = 100;
    session.lastActiveAt = new Date();
    await session.save();

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Analytics/Dashboard stats
export const getFormStats = async (req, res) => {
  try {
    const { formId, startDate, endDate } = req.query;

    const matchStage = {};
    if (formId) matchStage.formId = formId;

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Handle implicit abandonment (stale in_progress sessions)
    // We treat anything older than 1 hour as abandoned if still in_progress
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stats = await FormAbandonment.aggregate([
      { $match: matchStage },
      {
        $project: {
          formId: 1,
          lastCompletedField: 1,
          status: {
            $cond: [
              { $and: [{ $eq: ["$status", "in_progress"] }, { $lt: ["$lastActiveAt", oneHourAgo] }] },
              "abandoned",
              "$status"
            ]
          }
        }
      },
      {
        $group: {
          _id: "$formId",
          totalStarted: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "submitted"] }, 1, 0] } },
          abandoned: { $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          dropOffPoints: {
            $push: {
              $cond: [{ $eq: ["$status", "abandoned"] }, "$lastCompletedField", "$$REMOVE"]
            }
          }
        }
      }
    ]);

    // Post-process the dropOffPoints array to get frequency counts
    const formattedStats = stats.map((stat) => {
      const dropOffCounts = stat.dropOffPoints.reduce((acc, field) => {
        if (!field) field = "Started, no fields";
        acc[field] = (acc[field] || 0) + 1;
        return acc;
      }, {});

      // Sort dropoffs
      const commonDropOffs = Object.entries(dropOffCounts)
        .map(([field, count]) => ({ field, count }))
        .sort((a, b) => b.count - a.count);

      return {
        formId: stat._id,
        totalStarted: stat.totalStarted,
        completed: stat.completed,
        abandoned: stat.abandoned,
        inProgress: stat.inProgress,
        completionRate: stat.totalStarted > 0 ? (stat.completed / stat.totalStarted) * 100 : 0,
        abandonmentRate: stat.totalStarted > 0 ? (stat.abandoned / stat.totalStarted) * 100 : 0,
        commonDropOffs,
      };
    });

    res.status(200).json({ success: true, data: formattedStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
