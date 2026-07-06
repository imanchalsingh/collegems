// FILE: collegems-server/src/routes/feedback.routes.js
// NEW FILE — create this in your routes/ folder

import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  submitFeedback,
  getMyFeedback,
  getAllFeedback,
  getFeedbackAnalytics,
  updateFeedbackStatus,
  deleteFeedback,
  batchAnalyze,
} from "../controllers/feedback.controller.js";

import { sanitizeInput } from "../middlewares/sanitize.middleware.js";
import { validateFeedback } from "../validators/feedback.validator.js";

const router = express.Router();

// ── Student routes ────────────────────────────────────────────────────────────
router.post("/", protect, allowRoles("student"), sanitizeInput, validateFeedback, submitFeedback);
router.get("/my",   protect, allowRoles("student"), getMyFeedback);

// ── HOD routes ────────────────────────────────────────────────────────────────
router.post("/analyze-all", protect, allowRoles("hod"), batchAnalyze);
router.get("/all",        protect, allowRoles("hod"), getAllFeedback);
router.get("/analytics",  protect, allowRoles("hod"), getFeedbackAnalytics);
router.patch("/:id",      protect, allowRoles("hod"), sanitizeInput, updateFeedbackStatus);
router.delete("/:id",     protect, allowRoles("hod"), deleteFeedback);

export default router;
