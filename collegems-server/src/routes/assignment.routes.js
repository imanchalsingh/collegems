import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  createAssignment,
  submitAssignment,
  evaluateAssignment,
} from "../controllers/assignment.controller.js";
import Assignment from "../models/Assignment.model.js";

const router = express.Router();

router.post("/create", protect, allowRoles("teacher"), createAssignment);

router.post("/submit/:id", protect, allowRoles("student"), submitAssignment);

router.post(
  "/evaluate/:id",
  protect,
  allowRoles("teacher"),
  evaluateAssignment,
);

// get assignments for a course
// Student assignments (course-wise)
router.get("/student", protect, allowRoles("student","teacher"), async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate("course", "name code")
      .populate("teacher", "name");

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

export default router;
