import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import Salary from "../models/Salary.model.js";

const router = express.Router();

// HOD sets salary
router.post("/set", protect, allowRoles("hod"), async (req, res) => {
  try {
    const { staff, total, dueDate } = req.body;
    if (!staff || !total || !dueDate)
      return res.status(400).json({ message: "Staff, total amount and due date required" });

    const existing = await Salary.findOne({ staff });
    if (existing) return res.status(400).json({ message: "Salary already set for this staff" });

    const salary = await Salary.create({ staff, total, dueDate });
    res.status(201).json(salary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// HOD pays salary
router.post("/pay", protect, allowRoles("hod"), async (req, res) => {
  try {
    const { staff, amount } = req.body;
    if (!staff || !amount || amount <= 0)
      return res.status(400).json({ message: "Valid staff and amount required" });

    const salary = await Salary.findOne({ staff });
    if (!salary) return res.status(404).json({ message: "Salary record not found" });

    salary.installments.push({ amount });
    salary.paid += amount;
    await salary.save();

    res.json({ message: "Salary paid", salary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Staff views own salary
router.get("/me", protect, allowRoles("teacher", "staff"), async (req, res) => {
  try {
    const salary = await Salary.findOne({ staff: req.user.id });
    if (!salary) return res.status(404).json({ message: "No salary record found" });
    res.json(salary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// HOD views all salaries
router.get("/all", protect, allowRoles("hod"), async (req, res) => {
  try {
    const salaries = await Salary.find().populate("staff", "name email");
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
