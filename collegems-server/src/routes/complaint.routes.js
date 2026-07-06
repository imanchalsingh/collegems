import express from "express";
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  addComment
} from "../controllers/complaint.controller.js";
import { authenticate, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

// Student routes
router.post("/", restrictTo("student"), createComplaint);
router.get("/my-complaints", restrictTo("student"), getMyComplaints);

// Admin/HOD routes
router.get("/", restrictTo("hod", "admin"), getAllComplaints);
router.patch("/:id", restrictTo("hod", "admin"), updateComplaint);

// Shared routes (both can view and comment if authorized)
router.get("/:id", getComplaintById);
router.post("/:id/comments", addComment);

export default router;
