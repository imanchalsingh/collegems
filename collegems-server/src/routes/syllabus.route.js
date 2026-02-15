import express from "express";
import Syllabus from "../models/Syllabus.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Create syllabus (HOD + Teacher only)
router.post("/", authMiddleware, async (req, res) => {
  if (!["hod", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const syllabus = new Syllabus({
    ...req.body,
    createdBy: req.user.id,
  });

  await syllabus.save();
  res.json(syllabus);
});

// Get syllabus (All roles)
router.get("/", authMiddleware, async (req, res) => {
  const data = await Syllabus.find();
  res.json(data);
});

export default router;
