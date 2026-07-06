import User from "../models/User.model.js";
import { logAction } from "../utils/auditService.js";

const TRACKABLE_FIELDS = ["branch", "section", "semester", "course"];

// Update student fields and log transfer history
export const updateStudentTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const student = await User.findOne({ _id: id, role: "student" });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const historyEntries = [];

    // Track changes for each field
    for (const field of TRACKABLE_FIELDS) {
      if (updates[field] !== undefined && updates[field] !== student[field]) {
        historyEntries.push({
          field,
          previousValue: student[field] || "N/A",
          newValue: updates[field],
          changedAt: new Date(),
          changedBy: req.user.id,
        });
        student[field] = updates[field];
      }
    }

    // Add to transfer history
    if (historyEntries.length > 0) {
      student.transferHistory.push(...historyEntries);
    }

    await student.save();

    await logAction(req.user.id, "STUDENT_TRANSFER", "User", id, {
      changes: historyEntries,
    });

    res.json({
      message: "Student transfer updated successfully",
      student,
      changes: historyEntries,
    });
  } catch (error) {
    console.error("Error updating student transfer:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get transfer history for a student
export const getTransferHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findOne({ _id: id, role: "student" })
      .select("name email transferHistory")
      .populate("transferHistory.changedBy", "name role");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      student: { name: student.name, email: student.email },
      history: student.transferHistory.sort(
        (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
      ),
    });
  } catch (error) {
    console.error("Error fetching transfer history:", error);
    res.status(500).json({ message: "Server error" });
  }
};