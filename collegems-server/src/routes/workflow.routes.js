import express from "express";
import {
  createFormTemplate,
  createWorkflowDef,
  addWorkflowSteps,
  getAvailableWorkflows,
  submitWorkflowRequest,
  getMyRequests,
  getPendingApprovals,
  processWorkflowAction,
} from "../controllers/workflow.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// --- User Routes ---
router.get("/available", getAvailableWorkflows);
router.post("/submit", submitWorkflowRequest);
router.get("/my-requests", getMyRequests);

// --- Approver Routes ---
// Assuming any logged-in user could potentially be an approver if they have the right role
router.get("/pending-approvals", getPendingApprovals);
router.post("/process/:instanceId", processWorkflowAction);

// --- Admin Routes ---
// Restrict below routes to admin and hod
router.use(restrictTo("admin", "hod"));

router.post("/forms", createFormTemplate);
router.post("/definitions", createWorkflowDef);
router.post("/definitions/:workflowDefId/steps", addWorkflowSteps);

export default router;
