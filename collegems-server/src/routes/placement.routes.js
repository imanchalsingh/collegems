import express from "express";
import multer from "multer";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  createPlacementDrive,
  getPlacementDrives,
  getEligibleStudents,
  checkMyEligibility,
  parseResumeAts,
  scoreResumeAts,
  shortlistDriveCandidates,
} from "../controllers/placement.controller.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// HOD creates a drive
router.post("/", protect, authorize("hod"), createPlacementDrive);

// Anyone logged in can see all drives
router.get("/", protect, getPlacementDrives);

// Student checks their own eligibility
router.get("/my-eligibility", protect, authorize("student"), checkMyEligibility);

// ——— ATS matchmaking (#707) ———
router.post(
  "/ats/parse",
  protect,
  authorize("hod", "admin", "student", "teacher"),
  upload.single("file"),
  parseResumeAts
);
router.post(
  "/ats/score",
  protect,
  authorize("hod", "admin", "student", "teacher"),
  scoreResumeAts
);
router.post(
  "/:id/shortlist",
  protect,
  authorize("hod", "admin"),
  shortlistDriveCandidates
);

// HOD sees eligible students for a drive
router.get(
  "/:id/eligible-students",
  protect,
  authorize("hod"),
  getEligibleStudents
);

export default router;
