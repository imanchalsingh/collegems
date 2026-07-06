import Complaint from "../models/Complaint.model.js";

// Create a new complaint (Student)
export const createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority, evidenceUrl } = req.body;
    
    const newComplaint = new Complaint({
      student: req.user._id,
      title,
      description,
      category,
      priority: priority || "Medium",
      evidenceUrl,
    });

    await newComplaint.save();
    res.status(201).json(newComplaint);
  } catch (error) {
    res.status(500).json({ message: "Failed to create complaint", error: error.message });
  }
};

// Get all complaints for the logged-in student
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ student: req.user._id })
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role")
      .sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch complaints", error: error.message });
  }
};

// Get all complaints (Admin/HOD)
export const getAllComplaints = async (req, res) => {
  try {
    const { category, status, priority } = req.query;
    
    let filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate("student", "name email course semester studentId")
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role")
      .sort({ createdAt: -1 });

    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all complaints", error: error.message });
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

    // Ensure student can only view their own complaint unless they are admin
    if (req.user.role === "student" && complaint.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(complaint);
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
    if (priority) complaint.priority = priority;
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

    res.status(200).json(updatedComplaint);
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

    // Ensure student can only comment on their own complaint
    if (req.user.role === "student" && complaint.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    complaint.comments.push({
      sender: req.user._id,
      message,
      timestamp: new Date()
    });

    await complaint.save();

    const updatedComplaint = await Complaint.findById(req.params.id)
      .populate("student", "name email course semester studentId")
      .populate("assignedTo", "name email department")
      .populate("comments.sender", "name role");

    res.status(200).json(updatedComplaint);
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment", error: error.message });
  }
};
