import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import Fee from "../models/Fee.model.js";

const router = express.Router();

// hod sets fee of students
router.post("/set", protect, allowRoles("admin"), async (req, res) => {
  try {
    const { student, total, dueDate } = req.body;

    if (!student || !total || !dueDate) {
      return res.status(400).json({
        message: "Student, total amount and due date are required",
      });
    }

    const existingFee = await Fee.findOne({ student });

    if (existingFee) {
      return res.status(400).json({
        message: "Fee already exists for this student",
      });
    }

    const fee = await Fee.create({
      student,
      total,
      dueDate,
    });

    res.status(201).json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// installment pay
router.post("/pay", protect, allowRoles("student"), async (req, res) => {
  try {
    const { amount } = req.body;

    const fee = await Fee.findOne({ student: req.user.id });

    if (!fee) {
      return res.status(404).json({ message: "Fee record not found" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    fee.installments.push({ amount });
    fee.paid += amount;

    await fee.save();

    res.json({ message: "Payment successful", fee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//  Student views own fee

router.get("/me", protect, allowRoles("student"), async (req, res) => {
  try {
    const fee = await Fee.findOne({ student: req.user.id });

    if (!fee) {
      return res.status(404).json({
        message: "No fee record found",
      });
    }

    res.status(200).json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
