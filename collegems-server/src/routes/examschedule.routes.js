import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import ExamSchedule from "../models/ExamSchedule.model.js";

const router = express.Router();

// teacher, hod, admin add/create exam schedule
router.post(
  "/add",
  protect,
  allowRoles("hod", "admin", "teacher"),
  async (req, res) => {
    try {
      const {
        examName,
        course,
        examDate,
        startTime,
        endTime,
        location,
        venue,
      } = req.body;

      if (
        !examName ||
        !course ||
        !examDate ||
        !startTime ||
        !endTime ||
        !location ||
        !venue
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const examSchedule = await ExamSchedule.create({
        examName,
        course,
        examDate,
        startTime,
        endTime,
        location,
        venue,
      });

      res.status(201).json(examSchedule);
    } catch (err) {
      console.error("Add exam schedule error:", err);
      res.status(500).json({ message: "Failed to add exam schedule" });
    }
  },
);

// update exam schedule
router.put(
  "/update/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        examName,
        course,
        examDate,
        startTime,
        endTime,
        location,
        venue,
      } = req.body;
      const examSchedule = await ExamSchedule.findByIdAndUpdate(
        id,
        { examName, course, examDate, startTime, endTime, location, venue },
        { new: true },
      );
      if (!examSchedule) {
        return res.status(404).json({
          message: "Exam schedule not found",
        });
      }

      res.json(examSchedule);
    } catch (err) {
      console.error("Update exam schedule error:", err);
      res.status(500).json({
        message: "Failed to update exam schedule",
      });
    }
  },
);

// delete exam schedule
router.delete(
  "/delete/:id",
  protect,
  allowRoles("hod", "admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const examSchedule = await ExamSchedule.findByIdAndDelete(id);
      if (!examSchedule) {
        return res.status(404).json({
          message: "Exam schedule not found",
        });
      }
      res.json({
        message: "Exam schedule deleted",
      });
    } catch (err) {
      console.log("Exam not found");
      res.status(500).json({
        message: "Failed to delete exam schedule",
      });
    }
  },
);

// teacher, hod, admin, student get all exam schedules
router.get(
  "/all",
  protect,
  allowRoles("student", "teacher", "admin", "hod"),
  async (req, res) => {
    const examSchedule = await ExamSchedule.find({});
    res.json(examSchedule);
  },
);

export default router;
