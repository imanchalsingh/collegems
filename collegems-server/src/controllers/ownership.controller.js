import mongoose from "mongoose";
import User from "../models/User.model.js";

/**
 * Validates if the given model name is registered in Mongoose
 * and actually has the ownershipPlugin applied.
 */
const validateOwnershipModel = (modelName) => {
  if (!mongoose.models[modelName]) {
    throw new Error(`Model ${modelName} not found`);
  }
  const Model = mongoose.model(modelName);
  const paths = Object.keys(Model.schema.paths);
  if (!paths.includes("ownerId") || !paths.includes("ownershipHistory")) {
    throw new Error(`Model ${modelName} does not support ownership tracking`);
  }
  return Model;
};

// @desc    Get ownership info and history for a record
// @route   GET /api/ownership/info/:modelName/:recordId
// @access  Private
export const getOwnershipInfo = async (req, res) => {
  try {
    const { modelName, recordId } = req.params;
    const Model = validateOwnershipModel(modelName);

    const record = await Model.findById(recordId)
      .populate("ownerId", "name email role department profilePicture")
      .populate("ownershipHistory.previousOwnerId", "name email role")
      .populate("ownershipHistory.newOwnerId", "name email role")
      .populate("ownershipHistory.transferredBy", "name email role");

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        owner: record.ownerId,
        history: record.ownershipHistory,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Transfer ownership of a record
// @route   POST /api/ownership/transfer
// @access  Private
export const transferOwnership = async (req, res) => {
  try {
    const { modelName, recordId, newOwnerId, reason } = req.body;
    
    if (!modelName || !recordId || !newOwnerId) {
      return res.status(400).json({ success: false, message: "modelName, recordId, and newOwnerId are required" });
    }

    const Model = validateOwnershipModel(modelName);

    // Verify the new owner exists and is staff
    const newOwner = await User.findById(newOwnerId);
    if (!newOwner) {
      return res.status(404).json({ success: false, message: "New owner not found" });
    }
    if (!["teacher", "hod", "admin"].includes(newOwner.role)) {
      return res.status(400).json({ success: false, message: "New owner must be a staff member" });
    }

    const record = await Model.findById(recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    // Authorization: User must be admin, hod, or the current owner
    const isOwner = record.ownerId && record.ownerId.toString() === req.user._id.toString();
    const isAdminOrHod = ["admin", "hod"].includes(req.user.role);
    
    if (!isOwner && !isAdminOrHod) {
      return res.status(403).json({ success: false, message: "Not authorized to transfer ownership of this record" });
    }

    // Check if transferring to the same owner
    if (record.ownerId && record.ownerId.toString() === newOwnerId.toString()) {
      return res.status(400).json({ success: false, message: "User is already the owner of this record" });
    }

    const previousOwnerId = record.ownerId;

    // Update ownerId
    record.ownerId = newOwnerId;

    // Add to history
    record.ownershipHistory.push({
      previousOwnerId: previousOwnerId || null,
      newOwnerId: newOwnerId,
      transferredBy: req.user._id,
      reason: reason || "Ownership transferred via dashboard",
    });

    // Save (will trigger any other plugins like snapshots)
    await record.save();

    res.status(200).json({
      success: true,
      message: "Ownership successfully transferred",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
