import express from "express";
import {
  createAcademicEvent,
  getAllCalendarEvents,
  updateAcademicEvent,
  deleteAcademicEvent,
} from "../controllers/academicCalendar.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

// Get all merged events (Student, Teacher, HOD)
router.get("/", protect, getAllCalendarEvents);

// Manage custom events (restricted to HOD / Admin)
router.post("/", protect, allowRoles("hod"), createAcademicEvent);
router.put("/:id", protect, allowRoles("hod"), updateAcademicEvent);
router.delete("/:id", protect, allowRoles("hod"), deleteAcademicEvent);

export default router;
