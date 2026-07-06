import express from "express";
import {
  getSemesters,
  toggleSemesterFreeze,
  createOrActivateSession,
  reopenSession,
} from "../controllers/semester.controller.js";
import { authenticate, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get all semesters / sessions
router.get("/", authenticate, getSemesters);

// Activate a new session (auto-closes all currently-active sessions)
// Accessible by HOD and Admin
router.post(
  "/activate",
  authenticate,
  restrictTo("hod", "admin"),
  createOrActivateSession
);

// Reopen (unfreeze) a previously-frozen session
// Accessible by HOD and Admin
router.post(
  "/:semesterStr/reopen",
  authenticate,
  restrictTo("hod", "admin"),
  reopenSession
);

// Manually toggle the freeze status of a semester
// Accessible by HOD only (existing behaviour)
router.post(
  "/:semesterStr/toggle",
  authenticate,
  restrictTo("hod", "admin"),
  toggleSemesterFreeze
);

export default router;
