import Achievement from "../models/Achievement.model.js";
import mongoose from "mongoose";

// Submit a new achievement
export const submitAchievement = async (req, res) => {
  try {
    const { title, description, achievementDate, category } = req.body;

    if (!title || !description || !achievementDate) {
      return res
        .status(400)
        .json({ message: "Title, description, and date are required" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const achievement = await Achievement.create({
      teacher: req.user.id,
      title: title.trim(),
      description: description.trim(),
      achievementDate: new Date(achievementDate),
      category: category || "other",
      status: "submitted",
    });

    res.status(201).json({
      success: true,
      message: "Achievement submitted successfully",
      data: achievement,
    });
  } catch (error) {
    console.error("Submit Achievement Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit achievement",
    });
  }
};

// Get all achievements for a teacher
export const getTeacherAchievements = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const achievements = await Achievement.find({
      teacher: req.user.id,
    })
      .populate("teacher", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    console.error("Get Teacher Achievements Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch achievements",
    });
  }
};

// Get all achievements (for HOD/Admin to approve)
export const getAllAchievements = async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const achievements = await Achievement.find(query)
      .populate("teacher", "name email department teacherId")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    console.error("Get All Achievements Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch achievements",
    });
  }
};

// Get single achievement
export const getAchievementById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid achievement ID" });
    }

    const achievement = await Achievement.findById(id)
      .populate("teacher", "name email department")
      .populate("approvedBy", "name email");

    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }

    res.status(200).json({
      success: true,
      data: achievement,
    });
  } catch (error) {
    console.error("Get Achievement Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch achievement",
    });
  }
};

// Approve achievement (HOD/Admin only)
export const approveAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid achievement ID" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const achievement = await Achievement.findById(id);

    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }

    achievement.status = "approved";
    achievement.approvedBy = req.user.id;
    achievement.approvalDate = new Date();

    await achievement.save();

    res.status(200).json({
      success: true,
      message: "Achievement approved successfully",
      data: achievement,
    });
  } catch (error) {
    console.error("Approve Achievement Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve achievement",
    });
  }
};

// Reject achievement (HOD/Admin only)
export const rejectAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid achievement ID" });
    }

    if (!reason) {
      return res
        .status(400)
        .json({ message: "Rejection reason is required" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const achievement = await Achievement.findById(id);

    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }

    achievement.status = "rejected";
    achievement.approvedBy = req.user.id;
    achievement.rejectionReason = reason.trim();
    achievement.approvalDate = new Date();

    await achievement.save();

    res.status(200).json({
      success: true,
      message: "Achievement rejected successfully",
      data: achievement,
    });
  } catch (error) {
    console.error("Reject Achievement Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject achievement",
    });
  }
};

// Update achievement (teacher can only update pending/submitted)
export const updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, achievementDate, category } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid achievement ID" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const achievement = await Achievement.findById(id);

    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }

    // Only allow updates if not approved/rejected
    if (achievement.status === "approved" || achievement.status === "rejected") {
      return res.status(400).json({
        message: `Cannot update ${achievement.status} achievement`,
      });
    }

    // Only teacher can update their own achievement
    if (achievement.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (title) achievement.title = title.trim();
    if (description) achievement.description = description.trim();
    if (achievementDate) achievement.achievementDate = new Date(achievementDate);
    if (category) achievement.category = category;

    await achievement.save();

    res.status(200).json({
      success: true,
      message: "Achievement updated successfully",
      data: achievement,
    });
  } catch (error) {
    console.error("Update Achievement Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update achievement",
    });
  }
};

// Delete achievement (teacher can only delete their own)
export const deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid achievement ID" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const achievement = await Achievement.findById(id);

    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }

    // Only teacher can delete their own achievement
    if (achievement.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Achievement.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Achievement deleted successfully",
    });
  } catch (error) {
    console.error("Delete Achievement Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete achievement",
    });
  }
};
