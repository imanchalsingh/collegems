import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  createPlacementDrive,
  getPlacementDrives,
  getEligibleStudents,
  checkMyEligibility,
} from "../controllers/placement.controller.js";

const router = express.Router();

// HOD creates a drive
router.post(
  "/",
  protect,
  authorize("hod"),
  createPlacementDrive
);

// Anyone logged in can see all drives
router.get("/", protect, getPlacementDrives);

// Student checks their own eligibility
router.get(
  "/my-eligibility",
  protect,
  authorize("student"),
  checkMyEligibility
);

// HOD sees eligible students for a drive
router.get(
  "/:id/eligible-students",
  protect,
  authorize("hod"),
  getEligibleStudents
);

export default router;