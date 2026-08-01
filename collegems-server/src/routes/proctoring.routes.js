import express from "express";
import {
  startProctoringSession,
  recordViolation,
  endProctoringSession,
  getQuizProctoringReport,
  listProctoringSessions,
} from "../controllers/proctoring.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authenticate);

router.post("/sessions/start", allowRoles("student"), startProctoringSession);
router.post("/sessions/:sessionId/violations", allowRoles("student"), recordViolation);
router.post("/sessions/:sessionId/end", allowRoles("student", "teacher", "hod", "admin"), endProctoringSession);

router.get(
  "/quiz/:quizId/report",
  allowRoles("teacher", "hod", "admin"),
  getQuizProctoringReport,
);
router.get(
  "/sessions",
  allowRoles("teacher", "hod", "admin"),
  listProctoringSessions,
);

export default router;
