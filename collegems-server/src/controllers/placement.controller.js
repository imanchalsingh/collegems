import PlacementDrive from "../models/PlacementDrive.model.js";
import User from "../models/User.model.js";

// HOD creates a placement drive
export const createPlacementDrive = async (req, res) => {
  try {
    const {
      companyName, role, description,
      eligibility, driveDate, lastDateToApply
    } = req.body;

    const drive = await PlacementDrive.create({
      companyName,
      role,
      description,
      eligibility,
      driveDate,
      lastDateToApply,
      createdBy: req.user.id,
    });

    res.status(201).json(drive);
  } catch (error) {
    console.error("Error creating placement drive:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all placement drives
export const getPlacementDrives = async (req, res) => {
  try {
    const drives = await PlacementDrive.find()
      .sort({ createdAt: -1 });
    res.json(drives);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Check eligible students for a drive
export const getEligibleStudents = async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ message: "Drive not found" });
    }

    const { minCGPA, maxBacklogs, allowedBranches, graduationYear } =
      drive.eligibility;

    const students = await User.find({ role: "student" }).select("-password");

    const eligible = students.filter((s) => {
      if (minCGPA && (s.cgpa || 0) < minCGPA) return false;
      if (maxBacklogs !== undefined && (s.backlogs || 0) > maxBacklogs)
        return false;
      if (allowedBranches?.length > 0 && !allowedBranches.includes(s.course))
        return false;
      return true;
    });

    res.json({ drive, eligibleStudents: eligible });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Student checks their own eligibility
export const checkMyEligibility = async (req, res) => {
  try {
    const drives = await PlacementDrive.find({ status: { $ne: "closed" } });
    const student = await User.findById(req.user.id);

    const result = drives.map((drive) => {
      const { minCGPA, maxBacklogs, allowedBranches } = drive.eligibility;
      let eligible = true;
      const reasons = [];

      if (minCGPA && (student.cgpa || 0) < minCGPA) {
        eligible = false;
        reasons.push(`Minimum CGPA required: ${minCGPA}`);
      }
      if (maxBacklogs !== undefined && (student.backlogs || 0) > maxBacklogs) {
        eligible = false;
        reasons.push(`Maximum backlogs allowed: ${maxBacklogs}`);
      }
      if (allowedBranches?.length > 0 && !allowedBranches.includes(student.course)) {
        eligible = false;
        reasons.push(`Branch not eligible`);
      }

      return { drive, eligible, reasons };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};