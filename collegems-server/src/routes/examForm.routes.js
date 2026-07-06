import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  submitExamForm,
  getExamForms,
  updateExamFormStatus,
  deleteExamForm,
} from "../controllers/examForm.controller.js";

const router = express.Router();

// Student routes
router.post("/", protect, authorize("student"), submitExamForm);

// Student/HOD get forms routes
router.get("/", protect, getExamForms);

// HOD management routes
router.put("/:id/status", protect, authorize("hod"), updateExamFormStatus);
router.delete("/:id", protect, authorize("hod"), deleteExamForm);

export default router;
