import FacultyAssignment from "../models/FacultyAssignment.model.js";
import User from "../models/User.model.js";
import Course from "../models/Course.model.js";

const WORKLOAD_LIMIT = 6; // max subjects per faculty

// ─── HOD: Create assignment ───────────────────────────────────────────────────
export const createAssignment = async (req, res) => {
  try {
    const { faculty, course, section, semester, academicYear, department } = req.body;

    if (!faculty || !course || !section || !semester || !academicYear || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate faculty exists and is a teacher
    const facultyUser = await User.findOne({ _id: faculty, role: "teacher" });
    if (!facultyUser) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Validate course exists
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check duplicate: same course + section + academicYear
    const duplicate = await FacultyAssignment.findOne({ course, section, academicYear });
    if (duplicate) {
      return res.status(409).json({
        message: "This subject and section combination is already assigned for this academic year",
      });
    }

    // Workload check
    const currentLoad = await FacultyAssignment.countDocuments({
      faculty,
      academicYear,
      isActive: true,
    });
    if (currentLoad >= WORKLOAD_LIMIT) {
      return res.status(400).json({
        message: `Workload limit exceeded. Faculty already has ${currentLoad} assignments (limit: ${WORKLOAD_LIMIT})`,
        workloadLimitReached: true,
      });
    }

    const assignment = await FacultyAssignment.create({
      faculty,
      course,
      section,
      semester,
      academicYear,
      department,
      assignedBy: req.user.id,
    });

    const populated = await assignment.populate([
      { path: "faculty", select: "name email teacherId department" },
      { path: "course", select: "name code semester credits" },
    ]);

    // Warn if approaching limit
    const newLoad = currentLoad + 1;
    const response = { assignment: populated };
    if (newLoad >= WORKLOAD_LIMIT - 1) {
      response.warning = `Faculty now has ${newLoad}/${WORKLOAD_LIMIT} assignments. Approaching workload limit.`;
    }

    res.status(201).json(response);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "This subject and section combination is already assigned",
      });
    }
    console.error("Create assignment error:", err);
    res.status(500).json({ message: "Failed to create assignment" });
  }
};

// ─── HOD: Get all assignments ─────────────────────────────────────────────────
export const getAllAssignments = async (req, res) => {
  try {
    const { academicYear, semester, faculty, department } = req.query;
    const filter = {};

    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = Number(semester);
    if (faculty) filter.faculty = faculty;
    if (department) filter.department = department;

    const assignments = await FacultyAssignment.find(filter)
      .populate("faculty", "name email teacherId department")
      .populate("course", "name code semester credits")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
};

// ─── HOD: Get faculty workload summary ───────────────────────────────────────
export const getFacultyWorkload = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const filter = { isActive: true };
    if (academicYear) filter.academicYear = academicYear;

    const workload = await FacultyAssignment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$faculty",
          assignmentCount: { $sum: 1 },
          sections: { $addToSet: "$section" },
          semesters: { $addToSet: "$semester" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "facultyInfo",
        },
      },
      { $unwind: "$facultyInfo" },
      {
        $project: {
          _id: 1,
          assignmentCount: 1,
          sections: 1,
          semesters: 1,
          name: "$facultyInfo.name",
          email: "$facultyInfo.email",
          teacherId: "$facultyInfo.teacherId",
          department: "$facultyInfo.department",
          isOverloaded: { $gte: ["$assignmentCount", WORKLOAD_LIMIT] },
          workloadLimit: { $literal: WORKLOAD_LIMIT },
        },
      },
      { $sort: { assignmentCount: -1 } },
    ]);

    res.json({ workload, workloadLimit: WORKLOAD_LIMIT });
  } catch (err) {
    console.error("Get workload error:", err);
    res.status(500).json({ message: "Failed to fetch workload data" });
  }
};

// ─── HOD: Update assignment ───────────────────────────────────────────────────
export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { faculty, course, section, semester, academicYear, department } = req.body;

    const assignment = await FacultyAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // If changing faculty, check their workload
    if (faculty && faculty !== assignment.faculty.toString()) {
      const currentLoad = await FacultyAssignment.countDocuments({
        faculty,
        academicYear: academicYear || assignment.academicYear,
        isActive: true,
        _id: { $ne: id },
      });
      if (currentLoad >= WORKLOAD_LIMIT) {
        return res.status(400).json({
          message: `Cannot reassign. Target faculty already has ${currentLoad} assignments (limit: ${WORKLOAD_LIMIT})`,
          workloadLimitReached: true,
        });
      }
    }

    // Check duplicate if course/section/year is being changed
    if (course || section || academicYear) {
      const duplicate = await FacultyAssignment.findOne({
        course: course || assignment.course,
        section: section || assignment.section,
        academicYear: academicYear || assignment.academicYear,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(409).json({
          message: "This subject and section combination is already assigned",
        });
      }
    }

    const updated = await FacultyAssignment.findByIdAndUpdate(
      id,
      { faculty, course, section, semester, academicYear, department },
      { new: true, runValidators: true }
    ).populate([
      { path: "faculty", select: "name email teacherId department" },
      { path: "course", select: "name code semester credits" },
    ]);

    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "This subject and section combination is already assigned",
      });
    }
    console.error("Update assignment error:", err);
    res.status(500).json({ message: "Failed to update assignment" });
  }
};

// ─── HOD: Delete assignment ───────────────────────────────────────────────────
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await FacultyAssignment.findByIdAndDelete(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    res.json({ message: "Assignment removed successfully" });
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ message: "Failed to delete assignment" });
  }
};

// ─── Teacher: Get my assignments ──────────────────────────────────────────────
export const getMyAssignments = async (req, res) => {
  try {
    const assignments = await FacultyAssignment.find({
      faculty: req.user.id,
      isActive: true,
    })
      .populate("course", "name code semester credits department description")
      .populate("assignedBy", "name")
      .sort({ semester: 1 });

    res.json(assignments);
  } catch (err) {
    console.error("Get my assignments error:", err);
    res.status(500).json({ message: "Failed to fetch your assignments" });
  }
};

// ─── Student: Get faculty for my subjects ─────────────────────────────────────
export const getFacultyForStudent = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Access denied" });
    }

    const assignments = await FacultyAssignment.find({
      semester: Number(student.semester),
      isActive: true,
    })
      .populate("faculty", "name email teacherId department phone")
      .populate("course", "name code credits description")
      .sort({ "course.name": 1 });

    res.json(assignments);
  } catch (err) {
    console.error("Get faculty for student error:", err);
    res.status(500).json({ message: "Failed to fetch faculty assignments" });
  }
};

// ─── Shared: check if a teacher is assigned to a course+section ───────────────
export const checkTeacherAccess = async (teacherId, courseId, section) => {
  const assignment = await FacultyAssignment.findOne({
    faculty: teacherId,
    course: courseId,
    section,
    isActive: true,
  });
  return !!assignment;
};
