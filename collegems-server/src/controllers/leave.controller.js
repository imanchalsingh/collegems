import Leave from "../models/Leave.model.js";

// ── Student: submit a new leave request ─────────────────────────────
export const createLeave = async (req, res) => {
  try {
    const { subject, startDate, endDate, reason, type } = req.body;

    if (!subject || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date must be on or after start date" });
    }

    const leave = await Leave.create({
      user: req.user.id,
      role: req.user.role,
      subject,
      startDate,
      endDate,
      reason,
      type: type || "Casual",
    });

    res.status(201).json(leave);
  } catch (err) {
    console.error("Create leave error:", err);
    res.status(500).json({ message: "Failed to submit leave request" });
  }
};

// ── Student: get own leave requests ─────────────────────────────────
export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email");

    res.json(leaves);
  } catch (err) {
    console.error("Get my leaves error:", err);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
};

// ── Faculty / HOD: get all leave requests ───────────────────────────
export const getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ["Pending", "Approved", "Rejected"].includes(status)) {
      filter.status = status;
    }

    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email studentId course semester role")
      .populate("reviewedBy", "name email");

    res.json(leaves);
  } catch (err) {
    console.error("Get all leaves error:", err);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
};

// ── Faculty / HOD: approve or reject a leave ────────────────────────
export const reviewLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be 'Approved' or 'Rejected'" });
    }

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leave.status = status;
    leave.adminRemarks = adminRemarks || "";
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    await leave.save();

    // Re-populate before responding
    await leave.populate("user", "name email studentId course semester role");
    await leave.populate("reviewedBy", "name email");

    res.json(leave);
  } catch (err) {
    console.error("Review leave error:", err);
    res.status(500).json({ message: "Failed to review leave request" });
  }
};

// ── Student: delete own pending leave ───────────────────────────────
export const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leave.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (leave.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "Only pending leave requests can be withdrawn" });
    }

    await Leave.findByIdAndDelete(id);
    res.json({ message: "Leave request withdrawn successfully" });
  } catch (err) {
    console.error("Delete leave error:", err);
    res.status(500).json({ message: "Failed to withdraw leave request" });
  }
};