import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import Course from "../models/Course.model.js";

const router = express.Router();

// HOD/Admin adds course
router.post(
  "/add",
  protect,
  allowRoles("hod", "admin", "teacher"),
  async (req, res) => {
    try {
      const { name, code, department, semester } = req.body;

      if (!name || !code || !department || !semester) {
        return res.status(400).json({
          message: "All fields are required",
        });
      }

      const existing = await Course.findOne({ code });
      if (existing) {
        return res.status(400).json({
          message: "Course already exists",
        });
      }

      const course = await Course.create({
        name,
        code,
        department,
        semester,
      });

      res.status(201).json(course);
    } catch (err) {
      console.error("Add course error:", err);
      res.status(500).json({
        message: "Failed to add course",
      });
    }
  },
);
// update course
router.put(
  "/update/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, department, semester } = req.body;
      const course = await Course.findByIdAndUpdate(
        id,
        { name, code, department, semester },
        { new: true },
      );
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (err) {
      console.error("Update course error:", err);
      res.status(500).json({ message: "Failed to update course" });
    }
  },
);

// delete course
router.delete(
  "/delete/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const course = await Course.findByIdAndDelete(id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json({ message: "Course deleted" });
    } catch (err) {
      console.error("Delete course error:", err);
      res.status(500).json({ message: "Failed to delete course" });
    }
  },
);
// HOD/Admin view all courses
router.get(
  "/all",
  protect,
  allowRoles("hod", "admin", "teacher", "student"),
  async (req, res) => {
    const courses = await Course.find().populate("teacher", "name email");
    res.json(courses);
  },
);

export default router;
