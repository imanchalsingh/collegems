import * as restoreService from "../services/restore.service.js";

// @desc    Get list of supported models for restoration
// @route   GET /api/restore/models
// @access  Private (Admin/HOD)
export const getSupportedModels = (req, res) => {
  try {
    const models = restoreService.getSupportedModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching supported models" });
  }
};

// @desc    Get archived records for a specific model
// @route   GET /api/restore/:modelName
// @access  Private (Admin/HOD)
export const getArchivedRecords = async (req, res) => {
  try {
    const { modelName } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const data = await restoreService.getArchivedRecords(modelName, page, limit);
    res.json(data);
  } catch (error) {
    if (error.message.includes("does not support restoration")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error fetching archived records:", error);
    res.status(500).json({ message: "Server error fetching archived records" });
  }
};

// @desc    Get details of an archived record
// @route   GET /api/restore/:modelName/:id
// @access  Private (Admin/HOD)
export const getArchivedRecordDetails = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const record = await restoreService.getArchivedRecordDetails(modelName, id);
    res.json(record);
  } catch (error) {
    if (error.message === "Record not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("does not support restoration")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error fetching record details:", error);
    res.status(500).json({ message: "Server error fetching record details" });
  }
};

// @desc    Validate if a record can be safely restored
// @route   GET /api/restore/:modelName/:id/validate
// @access  Private (Admin/HOD)
export const validateRestoration = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const result = await restoreService.validateRestorationEligibility(modelName, id);
    
    // Send back just the eligibility and reason, omit the record document
    res.json({
      eligible: result.eligible,
      reason: result.reason || "Record can be restored safely.",
    });
  } catch (error) {
    if (error.message === "Record not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("does not support restoration") || error.message === "Record is not archived") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error validating restoration:", error);
    res.status(500).json({ message: "Server error validating restoration" });
  }
};

// @desc    Restore an archived record
// @route   POST /api/restore/:modelName/:id
// @access  Private (Admin/HOD)
export const restoreRecord = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const restoredBy = req.user.id;
    
    const restoredRecord = await restoreService.restoreRecord(modelName, id, restoredBy);
    
    res.json({
      message: `${modelName} restored successfully`,
      record: restoredRecord
    });
  } catch (error) {
    if (error.message.includes("Conflict")) {
      return res.status(409).json({ message: error.message });
    }
    if (error.message === "Record not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("does not support restoration") || error.message === "Record is not archived") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error restoring record:", error);
    res.status(500).json({ message: "Server error restoring record" });
  }
};
