import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import User from "../models/User.model.js";
import {
  getMe,
  updateMe,
  updatePassword,
  getPreferences,
  updatePreferences,
  getStudents,
  uploadResumeFile,
  getStudentSummary,
  getStudentProfile,
  bulkAssignTags,
  unlockAcademicRecord,
  createTeacher,
} from "../controllers/user.controller.js";
import { getCleanupSuggestions } from "../services/userCleanup.service.js";
import { uploadResume } from "../middlewares/upload.middleware.js";
import { auditAction } from "../middlewares/audit.middleware.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.put("/me", protect, authorize("teacher", "hod"), auditAction("UPDATE_PROFILE", "User"), updateMe);
router.put(
  "/me/password",
  protect,
  authorize("teacher", "hod"),
  auditAction("UPDATE_PASSWORD", "User"),
  updatePassword,
);
router.get(
  "/me/preferences",
  protect,
  authorize("teacher", "hod"),
  getPreferences,
);
router.put(
  "/me/preferences",
  protect,
  authorize("teacher", "hod"),
  updatePreferences,
);

// Resume Upload
router.post(
  "/me/resume",
  protect,
  authorize("student", "alumni"),
  uploadResume.single("resume"),
  uploadResumeFile
);

// Teacher fetches all students (Paginated)
router.get(
  "/students",
  protect,
  authorize("teacher", "hod"),
  getStudents
);

router.get(
  "/students/:id",
  protect,
  authorize("teacher", "hod"),
  getStudentProfile
);

router.get(
  "/students/:id/summary",
  protect,
  authorize("teacher", "hod", "admin"),
  getStudentSummary
);

router.put(
  "/students/bulk-tags",
  protect,
  authorize("teacher", "hod", "admin"),
  auditAction("BULK_ASSIGN_TAGS", "User"),
  bulkAssignTags
);

router.get("/teachers", protect, authorize("hod", "teacher", "student"), async (req, res) => {
  const teachers = await User.find({ role: "teacher" }).select("name email role teacherId department phone");

  res.json(teachers);
});
router.post(
  "/teachers",
  protect,
  authorize("hod"),
  createTeacher
);
// TODO: getCleanupSuggestions is not implemented yet
// router.get("/cleanup-suggestions", protect, authorize("admin"), getCleanupSuggestions);
router.put(
  "/students/:id/unlock",
  protect,
  authorize("admin"),
  auditAction("UNLOCK_ACADEMIC_RECORD", "User"),
  unlockAcademicRecord
);

export default router;

