import Scholarship from "../models/Scholarship.model.js";
import User from "../models/User.model.js";

// ── Student: Apply for a new scholarship ────────────────────────────
export const applyScholarship = async (req, res) => {
  try {
    const { scholarshipName, amount, academicYear, category, reason } = req.body;

    if (!scholarshipName || !amount || !academicYear || !category || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const scholarship = await Scholarship.create({
      studentId: req.user.id,
      scholarshipName,
      amount,
      academicYear,
      category,
      reason,
    });

    res.status(201).json(scholarship);
  } catch (err) {
    console.error("Apply scholarship error:", err);
    res.status(500).json({ message: "Failed to submit scholarship application" });
  }
};

// ── Student / Parent: Get my scholarship applications ───────────────
export const getMyScholarships = async (req, res) => {
  try {
    let studentId = req.user.id;

    if (req.user.role === "parent") {
      const parent = await User.findById(req.user.id);
      if (!parent || !parent.childId) {
        return res.status(400).json({ message: "No child linked to parent account" });
      }
      studentId = parent.childId;
    }

    const scholarships = await Scholarship.find({ studentId })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email");

    res.json(scholarships);
  } catch (err) {
    console.error("Get my scholarships error:", err);
    res.status(500).json({ message: "Failed to fetch scholarship applications" });
  }
};

// ── HOD / Admin: Get all scholarship applications ───────────────────
export const getAllScholarships = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (status && ["Pending", "Approved", "Rejected"].includes(status)) {
      filter.status = status;
    }

    const scholarships = await Scholarship.find(filter)
      .sort({ createdAt: -1 })
      .populate("studentId", "name email studentId course semester role")
      .populate("reviewedBy", "name email");

    res.json(scholarships);
  } catch (err) {
    console.error("Get all scholarships error:", err);
    res.status(500).json({ message: "Failed to fetch scholarship applications" });
  }
};

// ── HOD / Admin: Approve or reject scholarship ─────────────────────
export const reviewScholarship = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'Approved' or 'Rejected'" });
    }

    const scholarship = await Scholarship.findById(id);
    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship application not found" });
    }

    scholarship.status = status;
    scholarship.adminRemarks = adminRemarks || "";
    scholarship.reviewedBy = req.user.id;
    scholarship.reviewedAt = new Date();
    await scholarship.save();

    await scholarship.populate("studentId", "name email studentId course semester role");
    await scholarship.populate("reviewedBy", "name email");

    res.json(scholarship);
  } catch (err) {
    console.error("Review scholarship error:", err);
    res.status(500).json({ message: "Failed to review scholarship application" });
  }
};

// ── Student: Cancel pending scholarship application ──────────────────
export const cancelScholarship = async (req, res) => {
  try {
    const { id } = req.params;

    const scholarship = await Scholarship.findById(id);
    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship application not found" });
    }

    if (scholarship.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (scholarship.status !== "Pending") {
      return res.status(400).json({ message: "Only pending applications can be cancelled" });
    }

    await Scholarship.findByIdAndDelete(id);
    res.json({ message: "Scholarship application cancelled successfully" });
  } catch (err) {
    console.error("Cancel scholarship error:", err);
    res.status(500).json({ message: "Failed to cancel scholarship application" });
  }
};
