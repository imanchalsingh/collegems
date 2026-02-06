import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import User from "../models/User.model.js";

const router = express.Router();

// Teacher fetches all students
router.get(
  "/students",
  protect,
  allowRoles("teacher", "hod"),
  async (req, res) => {
    const students = await User.find({ role: "student" }).select("name email");

    res.json(students);
  },
);

router.get("/teachers", protect, allowRoles("hod"), async (req, res) => {
  const teachers = await User.find({ role: "teacher" }).select("name email");

  res.json(teachers);
});

export default router;
