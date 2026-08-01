import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  generateSeatingPlan,
  getSeatingPlan,
  publishSeatingPlan,
  exportDoorNoticePDF,
  exportInvigilatorPDF,
  getStudentSeatMap,
} from "../controllers/seatingPlan.controller.js";

const router = express.Router();

router.get("/student/my-seat", protect, allowRoles("student"), getStudentSeatMap);

router.post("/generate", protect, allowRoles("hod"), generateSeatingPlan);
router.get("/:id", protect, allowRoles("hod", "teacher"), getSeatingPlan);
router.put("/:id/publish", protect, allowRoles("hod"), publishSeatingPlan);
router.get("/:id/export/door-notice", protect, allowRoles("hod", "teacher"), exportDoorNoticePDF);
router.get("/:id/export/invigilator", protect, allowRoles("hod", "teacher"), exportInvigilatorPDF);

export default router;
