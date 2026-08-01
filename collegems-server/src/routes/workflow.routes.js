import express from "express";
import {
  createFormTemplate,
  listFormTemplates,
  updateFormTemplate,
  createWorkflowDef,
  listWorkflowDefs,
  addWorkflowSteps,
  saveWorkflowGraph,
  getWorkflowGraph,
  getInstanceAuditTrail,
  getAvailableWorkflows,
  submitWorkflowRequest,
  getMyRequests,
  getPendingApprovals,
  processWorkflowAction,
} from "../controllers/workflow.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

// --- User Routes ---
router.get("/available", getAvailableWorkflows);
router.post("/submit", submitWorkflowRequest);
router.get("/my-requests", getMyRequests);

// --- Approver Routes ---
router.get("/pending-approvals", getPendingApprovals);
router.post("/process/:instanceId", processWorkflowAction);
router.get("/instances/:instanceId/audit", getInstanceAuditTrail);

// --- Admin Routes ---
router.use(restrictTo("admin", "hod"));

router.get("/forms", listFormTemplates);
router.post("/forms", createFormTemplate);
router.put("/forms/:id", updateFormTemplate);

router.get("/definitions", listWorkflowDefs);
router.post("/definitions", createWorkflowDef);
router.post("/definitions/:workflowDefId/steps", addWorkflowSteps);
router.get("/definitions/:workflowDefId/graph", getWorkflowGraph);
router.put("/definitions/:workflowDefId/graph", saveWorkflowGraph);

export default router;
