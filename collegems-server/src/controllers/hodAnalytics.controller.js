import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Attendance from "../models/Attendance.model.js";
import Complaint from "../models/Complaint.model.js";
import Assignment from "../models/Assignment.model.js";

// @desc    Get detailed HOD dashboard metrics
// @route   GET /api/analytics/hod/dashboard
// @access  Private (HOD only)
export const getHodDashboardMetrics = async (req, res) => {
  try {
    const { departmentCode, department } = req.user;
    
    // We can use either departmentCode or department to filter. 
    // Assuming the HOD's department field maps to student/teacher department.
    const deptFilter = department || departmentCode;
    
    if (!deptFilter) {
      return res.status(400).json({ message: "No department assigned to HOD profile" });
    }

    const matchDept = { department: deptFilter };

    // 1. Total Enrollment in Department
    const totalEnrollment = await User.countDocuments({ role: "student", ...matchDept });

    // 2. Total Courses
    const totalCourses = await Course.countDocuments({ department: deptFilter });

    // 3. Active Faculty Members
    const activeFaculty = await User.countDocuments({ 
      role: "teacher", 
      accountStatus: "active", 
      ...matchDept 
    });

    // 4. Average Attendance
    // Find all students in this department
    const departmentStudents = await User.find({ role: "student", ...matchDept }).select("_id").lean();
    const studentIds = departmentStudents.map(s => s._id);
    
    let averageAttendance = 0;
    if (studentIds.length > 0) {
      const totalAttendance = await Attendance.countDocuments({ student: { $in: studentIds } });
      const presentAttendance = await Attendance.countDocuments({ 
        student: { $in: studentIds }, 
        status: "present" 
      });
      averageAttendance = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;
    }

    // 5. Recent Activity (Aggregating some recent events)
    // Recent Complaints
    const recentComplaints = await Complaint.find({ student: { $in: studentIds } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("student", "name")
      .lean();
      
    // Recent Assignments created by department faculty
    const facultyIds = await User.find({ role: "teacher", ...matchDept }).select("_id").lean();
    const fIds = facultyIds.map(f => f._id);
    
    const recentAssignments = await Assignment.find({ teacher: { $in: fIds } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("teacher", "name")
      .populate("course", "name")
      .lean();

    // Standardize recent activity format
    const recentActivity = [
      ...recentComplaints.map(c => ({
        id: c._id,
        type: "Complaint",
        title: c.title || "New Complaint",
        description: `Raised by ${c.student?.name || "Unknown"}`,
        date: c.createdAt
      })),
      ...recentAssignments.map(a => ({
        id: a._id,
        type: "Assignment",
        title: a.title,
        description: `Posted by ${a.teacher?.name || "Unknown"} for ${a.course?.name || "Unknown"}`,
        date: a.createdAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    // 6. Assemble Dashboard Data
    res.json({
      success: true,
      data: {
        totalEnrollment,
        totalCourses,
        activeFaculty,
        averageAttendance,
        recentActivity
      }
    });

  } catch (error) {
    console.error("Error fetching HOD dashboard metrics:", error);
    res.status(500).json({ success: false, message: "Server error fetching HOD metrics" });
  }
};
