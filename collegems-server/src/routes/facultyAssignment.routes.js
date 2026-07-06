import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  createAssignment,
  getAllAssignments,
  getFacultyWorkload,
  updateAssignment,
  deleteAssignment,
  getMyAssignments,
  getFacultyForStudent,
} from "../controllers/facultyAssignment.controller.js";

const router = express.Router();
console.log("Faculty Assignment Routes Loaded");
// ── HOD routes ────────────────────────────────────────────────────────────────
router.post("/", protect, allowRoles("hod"), createAssignment);
router.get("/all", protect, allowRoles("hod"), getAllAssignments);
router.get("/workload", protect, allowRoles("hod"), getFacultyWorkload);
router.put("/:id", protect, allowRoles("hod"), updateAssignment);
router.delete("/:id", protect, allowRoles("hod"), deleteAssignment);

// ── Teacher route ─────────────────────────────────────────────────────────────
router.get("/my", protect, allowRoles("teacher"), getMyAssignments);

// ── Student route ─────────────────────────────────────────────────────────────
router.get("/for-student", protect, allowRoles("student"), getFacultyForStudent);

export default router;
