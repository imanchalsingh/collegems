// routes/teacher.attendance.route.js
import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  markMyAttendance,
  getMyAttendance,
  getAllTeachersAttendance,
  getAttendanceStats,
} from "../controllers/teacher.attendance.controller.js";

const router = express.Router();

// Teacher routes
router.post("/mark", protect, allowRoles("teacher"), markMyAttendance);
router.get("/my-attendance", protect, allowRoles("teacher"), getMyAttendance);

// HOD routes
router.get("/all", protect, allowRoles("hod", "admin"), getAllTeachersAttendance);
router.get("/stats", protect, allowRoles("hod", "admin"), getAttendanceStats);

export default router;