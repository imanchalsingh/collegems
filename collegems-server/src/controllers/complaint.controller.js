import Complaint from "../models/Complaint.model.js";
import {
  computeSlaDeadline,
  getHandlerLabel,
  getSlaHours,
  getSlaStatus,
  formatRemaining,
  generateAnonymousTrackingId,
  hashTrackingSecret,
  getEscalationChain,
  ESCALATION_MATRIX,
  SLA_HOURS,
} from "../utils/slaEscalation.js";
import { processSlaEscalations } from "../cron/slaEscalationCron.js";

const decorateComplaint = (complaintDoc) => {
  const complaint = complaintDoc.toObject ? complaintDoc.toObject() : { ...complaintDoc };
  const sla = getSlaStatus(complaint);
  complaint.sla = {
    ...sla,
    hours: getSlaHours(complaint.priority),
    deadline: complaint.slaDeadline,
    remainingLabel: formatRemaining(sla.remainingMs),
    chain: getEscalationChain(complaint.category),
    currentHandler: complaint.currentHandlerRole,
  };

  if (complaint.isAnonymous) {
    complaint.studentDisplay = {
      name: "Anonymous Reporter",
      studentId: complaint.anonymousTrackingId || "HIDDEN",
      email: "hidden",
    };
    // Keep student id only for owner checks; strip PII for admin responses
    if (complaint.student && typeof complaint.student === "object") {
      complaint.student = {
        _id: complaint.student._id,
        name: "Anonymous Reporter",
        studentId: complaint.anonymousTrackingId || "HIDDEN",
        email: undefined,
        course: undefined,
        semester: undefined,
      };
    }
  }

  return complaint;
};

// Create a new complaint (Student)
export const createComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      evidenceUrl,
      isAnonymous,
    } = req.body;

    const resolvedPriority = priority || "Medium";
    const trackingId = isAnonymous ? generateAnonymousTrackingId() : undefined;

    const newComplaint = new Complaint({
      student: req.user.id,
      title,
      description,
      category,
      priority: resolvedPriority,
      evidenceUrl,
      isAnonymous: Boolean(isAnonymous),
      anonymousTrackingId: trackingId,
      trackingIdHash: trackingId ? hashTrackingSecret(trackingId) : undefined,
      slaDeadline: computeSlaDeadline(new Date(), resolvedPriority),
      escalationLevel: 0,
      currentHandlerRole: getHandlerLabel(category || "Administration", 0),
      escalationHistory: [],
    });

    await newComplaint.save();
    res.status(201).json(decorateComplaint(newComplaint));
  } catch (error) {
    res.status(500).json({ message: "Failed to create complaint", error: error.message });
  }
};

// Get all complaints for the logged-in student
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ student: req.user.id })
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role")
      .sort({ createdAt: -1 });
    res.status(200).json(complaints.map(decorateComplaint));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch complaints", error: error.message });
  }
};

// Get all complaints (Admin/HOD)
export const getAllComplaints = async (req, res) => {
  try {
    const { category, status, priority, slaBreached, escalated } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (slaBreached === "true") filter.slaBreached = true;
    if (escalated === "true") filter.escalationLevel = { $gt: 0 };

    const complaints = await Complaint.find(filter)
      .populate("student", "name email course semester studentId")
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role")
      .sort({ slaDeadline: 1, createdAt: -1 });

    res.status(200).json(complaints.map(decorateComplaint));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all complaints", error: error.message });
  }
};

// Escalation matrix + SLA overview for admin dashboard
export const getEscalationMatrix = async (req, res) => {
  try {
    const open = await Complaint.find({
      status: { $in: ["Submitted", "Under Review", "In Progress"] },
    })
      .populate("student", "name email studentId")
      .populate("assignedTo", "name email")
      .sort({ slaDeadline: 1 });

    const decorated = open.map(decorateComplaint);
    const breached = decorated.filter((c) => c.sla?.state === "breached" || c.slaBreached);
    const warning = decorated.filter((c) => c.sla?.state === "warning" || c.sla?.state === "critical");

    res.json({
      success: true,
      data: {
        slaHours: SLA_HOURS,
        matrix: ESCALATION_MATRIX,
        summary: {
          open: decorated.length,
          breached: breached.length,
          approaching: warning.length,
        },
        complaints: decorated,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load escalation matrix",
      error: error.message,
    });
  }
};

// Track anonymous complaint by tracking ID (student or public-ish auth)
export const trackAnonymousComplaint = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const complaint = await Complaint.findOne({
      anonymousTrackingId: trackingId,
      isAnonymous: true,
    })
      .populate("assignedTo", "name department")
      .populate("comments.sender", "name role");

    if (!complaint) {
      return res.status(404).json({ message: "No grievance found for this tracking ID" });
    }

    // Only owner or admin/hod can track
    const isOwner = complaint.student.toString() === req.user.id.toString();
    const isAdmin = ["hod", "admin"].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(decorateComplaint(complaint));
  } catch (error) {
    res.status(500).json({ message: "Failed to track complaint", error: error.message });
  }
};

// Manual escalate (HOD/Admin)
export const manualEscalateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    if (["Resolved", "Closed"].includes(complaint.status)) {
      return res.status(400).json({ message: "Cannot escalate a resolved complaint" });
    }

    const { escalateComplaint } = await import("../cron/slaEscalationCron.js");
    const result = await escalateComplaint(
      complaint,
      req.body.reason || "Manual escalation by administrator"
    );

    const updated = await Complaint.findById(complaint._id)
      .populate("student", "name email course semester studentId")
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role");

    res.json({
      success: true,
      escalated: result.escalated,
      message: result.escalated
        ? `Escalated to ${result.toHandler}`
        : result.reason,
      data: decorateComplaint(updated),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to escalate complaint", error: error.message });
  }
};

// Run SLA processor on demand (admin)
export const runSlaProcessor = async (req, res) => {
  try {
    const summary = await processSlaEscalations();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ message: "SLA processor failed", error: error.message });
  }
};

// Get a single complaint by ID
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("student", "name email course semester studentId")
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (req.user.role === "student" && complaint.student._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(decorateComplaint(complaint));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch complaint", error: error.message });
  }
};

// Update complaint status or priority (Admin/HOD)
export const updateComplaint = async (req, res) => {
  try {
    const { status, priority, resolutionNotes, assignedTo } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (status) complaint.status = status;
    if (priority) {
      complaint.priority = priority;
      if (!["Resolved", "Closed"].includes(complaint.status)) {
        complaint.slaDeadline = computeSlaDeadline(new Date(), priority);
        complaint.lastEscalatedAt = new Date();
        complaint.slaBreached = false;
      }
    }
    if (assignedTo) complaint.assignedTo = assignedTo;

    if (resolutionNotes) {
      complaint.resolutionNotes = resolutionNotes;
    }

    if (status === "Resolved" || status === "Closed") {
      if (!complaint.resolvedAt) complaint.resolvedAt = new Date();
    } else {
      complaint.resolvedAt = undefined;
    }

    await complaint.save();

    const updatedComplaint = await Complaint.findById(req.params.id)
      .populate("student", "name email course semester studentId")
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role");

    res.status(200).json(decorateComplaint(updatedComplaint));
  } catch (error) {
    res.status(500).json({ message: "Failed to update complaint", error: error.message });
  }
};

// Add a comment to a complaint (Both Student and Admin)
export const addComment = async (req, res) => {
  try {
    const { message } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (req.user.role === "student" && complaint.student.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    complaint.comments.push({
      sender: req.user.id,
      message,
      timestamp: new Date(),
    });

    await complaint.save();

    const updatedComplaint = await Complaint.findById(req.params.id)
      .populate("student", "name email course semester studentId")
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role");

    res.status(200).json(decorateComplaint(updatedComplaint));
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment", error: error.message });
  }
};
