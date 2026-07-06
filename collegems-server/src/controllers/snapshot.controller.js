import mongoose from "mongoose";
import RecordSnapshot from "../models/RecordSnapshot.model.js";

/**
 * Get snapshots for a specific record
 * GET /api/snapshots/:modelName/:recordId
 */
export const getRecordSnapshots = async (req, res) => {
  try {
    const { modelName, recordId } = req.params;

    const snapshots = await RecordSnapshot.find({ modelName, recordId })
      .sort({ createdAt: -1 })
      .populate("editor", "name email role")
      .lean();

    res.status(200).json({
      success: true,
      data: snapshots,
    });
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Restore a record to a specific snapshot
 * POST /api/snapshots/:id/restore
 */
export const restoreSnapshot = async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await RecordSnapshot.findById(id).lean();
    if (!snapshot) {
      return res.status(404).json({ success: false, message: "Snapshot not found" });
    }

    const { modelName, recordId, data } = snapshot;

    // Check if the model exists in mongoose
    if (!mongoose.models[modelName]) {
      return res.status(400).json({
        success: false,
        message: `Model ${modelName} is not registered in this instance.`,
      });
    }

    const Model = mongoose.model(modelName);

    // Filter out some mongoose/mongo internals from snapshot data
    const restoreData = { ...data };
    delete restoreData._id;
    delete restoreData.__v;

    // We must pass { editorId: req.user.id } so that THIS restoration 
    // also generates a snapshot (reverting is just an update)
    const updatedRecord = await Model.findByIdAndUpdate(
      recordId,
      restoreData,
      { new: true, runValidators: false, editorId: req.user?.id }
    );

    if (!updatedRecord) {
      // If the record was completely deleted, we need to re-create it.
      const newRecord = await Model.create([data], { editorId: req.user?.id });
      return res.status(200).json({
        success: true,
        message: "Record successfully restored from snapshot (recreated)",
        data: newRecord[0],
      });
    }

    res.status(200).json({
      success: true,
      message: "Record successfully restored from snapshot",
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Error restoring snapshot:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};
