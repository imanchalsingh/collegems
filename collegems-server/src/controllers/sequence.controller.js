import { analyzeSequence, executeRepair } from "../services/sequence.service.js";
import { logAction } from "../utils/auditService.js";

/**
 * Analyze a sequence
 * GET /api/sequences/analyze?model=User&field=studentId&prefix=STU&padding=3
 */
export const analyze = async (req, res) => {
  try {
    const { model, field, prefix, padding } = req.query;

    if (!model || !field || !prefix || !padding) {
      return res.status(400).json({ success: false, message: "Missing required query parameters" });
    }

    const padLen = parseInt(padding, 10);
    if (isNaN(padLen) || padLen <= 0) {
      return res.status(400).json({ success: false, message: "Padding must be a positive integer" });
    }

    const analysis = await analyzeSequence(model, field, prefix, padLen);

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Sequence Analysis Error:", error);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

/**
 * Execute a sequence repair
 * POST /api/sequences/repair
 * Body: { model, field, prefix, padding, previewData }
 */
export const repair = async (req, res) => {
  try {
    const { model, field, prefix, padding, previewData } = req.body;

    if (!model || !field || !previewData || !Array.isArray(previewData)) {
      return res.status(400).json({ success: false, message: "Invalid payload parameters" });
    }

    if (previewData.length === 0) {
      return res.status(400).json({ success: false, message: "No repair actions provided" });
    }

    const padLen = parseInt(padding, 10);

    const result = await executeRepair(model, field, previewData, req.user?.id);

    // Audit Log
    await logAction(req.user?.id, "SEQUENCE_REPAIR", model, null, {
      field,
      prefix,
      padding: padLen,
      repairedCount: result.successCount,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Sequence Repair Error:", error);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};
