import express from "express";
// Change it to exactly this:
import { protect, restrictTo } from '../middlewares/auth.middleware.js'; // Adjust 'middlewares' vs 'middleware' based on your folder name!
import { getHODLeaveDashboardData, overrideLeaveStatus } from '../controllers/hodLeaveController.js';
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  createLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
  deleteLeave,
} from "../controllers/leave.controller.js";

const router = express.Router();

// ── Student endpoints ───────────────────────────────────────────────
router.post(
  "/",
  protect,
  allowRoles("student", "teacher"),
  createLeave
);

router.get(
  "/me",
  protect,
  allowRoles("student", "teacher"),
  getMyLeaves
);

router.delete(
  "/:id",
  protect,
  allowRoles("student", "teacher"),
  deleteLeave
);

// ── Faculty / HOD endpoints ─────────────────────────────────────────
router.get(
  "/all",
  protect,
  allowRoles("teacher", "hod"),
  getAllLeaves
);

router.patch(
  "/:id/review",
  protect,
  allowRoles("teacher", "hod"),
  reviewLeave
);
// ==========================================
// HOD LEAVE OVERSIGHT ROUTES
// ==========================================

// Fetch dashboard data
router.get(
  '/hod/dashboard', 
  protect, 
  restrictTo('hod'), // <-- Changed this!
  getHODLeaveDashboardData
);

// Override a leave status
router.put(
  '/hod/:leaveId/override', 
  protect, 
  restrictTo('hod'), // <-- Changed this!
  overrideLeaveStatus
);

export default router;
