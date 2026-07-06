import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  generateAllocation,
  getAllocation,
  publishAllocation,
  updateSeats,
  regenerateAllocation,
  exportPDF,
  exportCSV,
  getStudentSeat,
} from "../controllers/hallAllocation.controller.js";

const router = express.Router();

// Student route (must be before :examScheduleId param route)
router.get("/student/my-seat", protect, allowRoles("student"), getStudentSeat);

router.post("/generate", protect, allowRoles("hod"), generateAllocation);
router.get("/:examScheduleId", protect, allowRoles("hod", "teacher"), getAllocation);
router.put("/:id/publish", protect, allowRoles("hod"), publishAllocation);
router.put("/:id/seats", protect, allowRoles("hod"), updateSeats);
router.post("/:id/regenerate", protect, allowRoles("hod"), regenerateAllocation);
router.get("/:id/export/pdf", protect, allowRoles("hod", "teacher"), exportPDF);
router.get("/:id/export/csv", protect, allowRoles("hod", "teacher"), exportCSV);

export default router;
