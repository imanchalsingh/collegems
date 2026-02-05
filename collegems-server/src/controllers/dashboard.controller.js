import Course from "../models/Course.model.js";
import Attendance from "../models/Attendance.model.js";
import Assignment from "../models/Assignment.model.js";
import Fee from "../models/Fee.model.js";
import User from "../models/User.model.js";

export const getDashboardData = async (req, res) => {
  const { role, id } = req.user;

  // 🎓 STUDENT
  if (role === "student") {
    const total = await Attendance.countDocuments({ student: id });
    const present = await Attendance.countDocuments({ student: id, status: "present" });

    const assignments = await Assignment.countDocuments({
      "submissions.student": { $ne: id }
    });

    const fee = await Fee.findOne({ student: id });

    return res.json({
      cards: [
        { title: "Attendance %", value: total ? Math.round((present / total) * 100) + "%" : "0%" },
        { title: "Pending Assignments", value: assignments },
        { title: "Fee Due", value: fee ? fee.total - fee.paid : 0 }
      ]
    });
  }

  // 👨‍🏫 TEACHER
  if (role === "teacher") {
    const courses = await Course.countDocuments({ teacher: id });

    const pendingEval = await Assignment.countDocuments({
      teacher: id,
      submissions: { $elemMatch: { marks: { $exists: false } } }
    });

    return res.json({
      cards: [
        { title: "My Courses", value: courses },
        { title: "Pending Evaluations", value: pendingEval }
      ]
    });
  }

  // 🧑‍💼 HOD
  if (role === "hod") {
    const students = await User.countDocuments({ role: "student" });
    const teachers = await User.countDocuments({ role: "teacher" });
    const courses = await Course.countDocuments();

    return res.json({
      cards: [
        { title: "Students", value: students },
        { title: "Teachers", value: teachers },
        { title: "Courses", value: courses }
      ]
    });
  }

  // 🛠 ADMIN
  if (role === "admin") {
    const users = await User.countDocuments();
    const students = await User.countDocuments({ role: "student" });
    const teachers = await User.countDocuments({ role: "teacher" });

    return res.json({
      cards: [
        { title: "Total Users", value: users },
        { title: "Students", value: students },
        { title: "Teachers", value: teachers }
      ]
    });
  }

  res.status(403).json({ message: "Invalid role" });
};
