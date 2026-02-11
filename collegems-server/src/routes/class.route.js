import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import Class from "../models/Classes.model.js";

const router = express.Router();

// HOD/Admin adds course
router.post(
  "/add",
  protect,
  allowRoles("hod", "admin", "teacher"),
  async (req, res) => {
    try {
      const { courseName, name, semester, schedule, teacher } = req.body;

      if (!courseName || !name || !semester || !schedule || !teacher) {
        return res.status(400).json({
          message: "All fields are required",
        });
      }

      const existing = await Class.findOne({ name });
      if (existing) {
        return res.status(400).json({
          message: "Classes already exists",
        });
      }

      const classes = await Class.create({
        courseName,
        name,
        semester,
        schedule,
        teacher,
      });

      res.status(201).json(classes);
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
      const { courseName, name, semester, schedule, teacher } = req.body;
      const classes = await Class.findByIdAndUpdate(
        id,
        { courseName, name, semester, schedule, teacher },
        { new: true },
      );
      if (!classes) {
        return res.status(404).json({ message: "Classes not found" });
      }
      res.json(classes);
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
      const classes = await Class.findByIdAndDelete(id);
      if (!classes) {
        return res.status(404).json({ message: "Classes not found" });
      }
      res.json({ message: "Class deleted" });
    } catch (err) {
      console.error("Delete class error:", err);
      res.status(500).json({ message: "Failed to delete class" });
    }
  },
);
// HOD/Admin view all courses
router.get(
  "/all",
  protect,
  allowRoles("hod", "admin", "teacher", "student"),
  async (req, res) => {
    const classes = await Class.find()
      .populate("teacher", "name email")
      .populate("courseName", "name");
    res.json(classes);
  },
);

export default router;
