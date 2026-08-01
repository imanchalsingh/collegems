import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { mlInferenceLimiter } from "../middlewares/dynamicRateLimiter.js";
import {
  runPlagiarismCheck,
  getAssignmentReports,
  getSubmissionReport,
  reviewReport,
  submitAppeal,
  reviewAppeal,
} from "../controllers/plagiarism.controller.js";
import {
  runCodePlagiarismAnalysis,
  analyzeCodeSnippets,
} from "../controllers/codePlagiarism.controller.js";

const router = express.Router();

// AST / Winnowing code similarity (programming assignments)
router.post(
  "/code/check/:assignmentId",
  protect,
  allowRoles("teacher", "hod"),
  runCodePlagiarismAnalysis
);
router.post(
  "/code/analyze",
  protect,
  allowRoles("teacher", "hod"),
  analyzeCodeSnippets
);

// Run (or re-run) a plagiarism check across all submissions for an assignment
router.post(
  "/check/:assignmentId",
  protect,
  allowRoles("teacher", "hod"),
  mlInferenceLimiter,
  runPlagiarismCheck
);

// Get all reports for an assignment (sorted by similarity desc)
router.get(
  "/assignment/:assignmentId",
  protect,
  allowRoles("teacher", "hod"),
  getAssignmentReports
);

// Get a single student's report for an assignment
router.get(
  "/assignment/:assignmentId/student/:studentId",
  protect,
  allowRoles("teacher", "hod"),
  getSubmissionReport
);

// Mark a report as reviewed / cleared / action taken
router.patch(
  "/report/:id/review",
  protect,
  allowRoles("teacher", "hod"),
  reviewReport
);

// Student: Submit an appeal
router.post(
  "/appeal",
  protect,
  allowRoles("student"),
  submitAppeal
);

// Teacher: Review an appeal
router.patch(
  "/appeal/:id/review",
  protect,
  allowRoles("teacher", "hod"),
  reviewAppeal
);

export default router;
