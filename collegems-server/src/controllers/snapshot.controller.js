import mongoose from "mongoose";
import RecordSnapshot from "../models/RecordSnapshot.model.js";
import { flattenDelta, sanitizeDoc, jsonDiffer } from "../plugins/auditTrailPlugin.js";
import { logAction } from "../utils/auditService.js";

/**
 * Get snapshots for a specific record (timeline).
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
 * Field-level diff for one snapshot vs current (or vs afterData).
 * GET /api/snapshots/:id/diff
 */
export const getSnapshotDiff = async (req, res) => {
  try {
    const snapshot = await RecordSnapshot.findById(req.params.id)
      .populate("editor", "name email role")
      .lean();

    if (!snapshot) {
      return res.status(404).json({ success: false, message: "Snapshot not found" });
    }

    let after = snapshot.afterData || null;
    let fieldDiffs = snapshot.fieldDiffs || [];

    // If afterData missing, compare snapshot.data to live record
    if (!after && mongoose.models[snapshot.modelName]) {
      const Model = mongoose.model(snapshot.modelName);
      const live = await Model.findById(snapshot.recordId).lean();
      if (live) {
        after = sanitizeDoc(live);
        const delta = jsonDiffer.diff(snapshot.data, after);
        fieldDiffs = flattenDelta(delta);
      }
    }

    if ((!fieldDiffs || fieldDiffs.length === 0) && snapshot.delta) {
      fieldDiffs = flattenDelta(snapshot.delta);
    }

    res.status(200).json({
      success: true,
      data: {
        snapshotId: snapshot._id,
        modelName: snapshot.modelName,
        recordId: snapshot.recordId,
        operation: snapshot.operation,
        createdAt: snapshot.createdAt,
        editor: snapshot.editor,
        actorRole: snapshot.actorRole,
        ipAddress: snapshot.ipAddress,
        userAgent: snapshot.userAgent,
        before: snapshot.data,
        after,
        delta: snapshot.delta,
        fieldDiffs,
      },
    });
  } catch (error) {
    console.error("Error building snapshot diff:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Search recent snapshots across sensitive models (Marks/Results, Attendance, Fee).
 * GET /api/snapshots/search?modelName=Results&limit=50
 */
export const searchSnapshots = async (req, res) => {
  try {
    const {
      modelName,
      recordId,
      limit = 50,
    } = req.query;

    const filter = {};
    if (modelName) filter.modelName = modelName;
    if (recordId) filter.recordId = recordId;

    // Default to sensitive admin records when no model filter
    if (!modelName) {
      filter.modelName = { $in: ["Results", "Attendance", "Fee", "User"] };
    }

    const snapshots = await RecordSnapshot.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .populate("editor", "name email role")
      .lean();

    res.status(200).json({ success: true, data: snapshots });
  } catch (error) {
    console.error("Error searching snapshots:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Restore a record to a specific snapshot (one-click rollback).
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

    if (!mongoose.models[modelName]) {
      return res.status(400).json({
        success: false,
        message: `Model ${modelName} is not registered in this instance.`,
      });
    }

    const Model = mongoose.model(modelName);

    const restoreData = { ...data };
    delete restoreData._id;
    delete restoreData.__v;

    const updatedRecord = await Model.findByIdAndUpdate(
      recordId,
      restoreData,
      { new: true, runValidators: false, editorId: req.user?.id, actorRole: req.user?.role }
    );

    if (!updatedRecord) {
      const newRecord = await Model.create([data], {
        editorId: req.user?.id,
        actorRole: req.user?.role,
      });

      await logAction(req.user?.id, "RESTORE_SNAPSHOT", modelName, recordId, {
        snapshotId: id,
        recreated: true,
      });

      return res.status(200).json({
        success: true,
        message: "Record successfully restored from snapshot (recreated)",
        data: newRecord[0],
      });
    }

    await logAction(req.user?.id, "RESTORE_SNAPSHOT", modelName, recordId, {
      snapshotId: id,
      recreated: false,
    });

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
