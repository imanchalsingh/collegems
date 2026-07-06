import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Attendance from "../models/Attendance.model.js";
import TeacherAttendance from "../models/TeacherAttendance.js";
import Results from "../models/Results.model.js";
import Leave from "../models/Leave.model.js";
import Assignment from "../models/Assignment.model.js";
import Salary from "../models/Salary.model.js";

// Fetch unique filter values (departments, courses, semesters, users)
export const getFilterOptions = async (req, res) => {
  try {
    // Unique departments from both Course and User models
    const courseDeps = await Course.distinct("department");
    const teacherDeps = await User.distinct("department", { role: "teacher" });
    const departments = Array.from(new Set([...courseDeps, ...teacherDeps])).filter(Boolean);

    // List of courses
    const courses = await Course.find().select("name code department semester");

    // List of semesters
    const semesters = await User.distinct("semester", { role: "student" }).then(sems => 
      sems.filter(Boolean).sort()
    );

    // All active students and teachers for dropdown filters
    const students = await User.find({ role: "student" }).select("name studentId semester course email");
    const teachers = await User.find({ role: "teacher" }).select("name teacherId department email");

    res.json({
      departments,
      courses,
      semesters,
      students,
      teachers,
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ message: "Failed to fetch filter options" });
  }
};

// Generate aggregated report
export const generateReport = async (req, res) => {
  try {
    const { type, userId, department, semester, startDate, endDate } = req.query;

    if (!type || !["student", "teacher"].includes(type)) {
      return res.status(400).json({ message: "Invalid or missing report type" });
    }

    if (type === "student") {
      const studentQuery = { role: "student" };

      if (userId) {
        studentQuery._id = userId;
      }
      if (semester) {
        studentQuery.semester = semester;
      }
      if (department) {
        // Find course name match or exact match on student course field
        studentQuery.course = { $regex: department, $options: "i" };
      }

      const students = await User.find(studentQuery).select(
        "name email phone studentId course semester"
      );

      const studentIds = students.map((s) => s._id);
      const studentSemesters = [...new Set(students.map((s) => Number(s.semester)).filter((s) => !isNaN(s)))];
      const studentCoursesList = [...new Set(students.map((s) => s.course).filter(Boolean))];

      // 1. Batch Course fetching
      const allCourses = await Course.find({
        $or: [
          { semester: { $in: studentSemesters } },
          { department: { $in: studentCoursesList } },
        ],
      }).populate("teacher", "name email");

      // 2. Batch Attendance fetching
      const attQuery = { student: { $in: studentIds } };
      if (startDate || endDate) {
        attQuery.date = {};
        if (startDate) attQuery.date.$gte = startDate;
        if (endDate) attQuery.date.$lte = endDate;
      }
      const allAttendance = await Attendance.find(attQuery).populate("course", "name code");

      // Group Attendance by student ID
      const attendanceMap = new Map();
      for (const att of allAttendance) {
        if (att.student) {
          const sId = att.student.toString();
          if (!attendanceMap.has(sId)) {
            attendanceMap.set(sId, []);
          }
          attendanceMap.get(sId).push(att);
        }
      }

      // 3. Batch Results fetching
      const allResults = await Results.find({ studentId: { $in: studentIds } }).populate("courseId", "name code department");

      // Group Results by student ID
      const resultsMap = new Map();
      for (const r of allResults) {
        if (r.studentId) {
          const sId = r.studentId.toString();
          if (!resultsMap.has(sId)) {
            resultsMap.set(sId, []);
          }
          resultsMap.get(sId).push(r);
        }
      }

      // 4. Batch Leaves fetching
      const leaveQuery = { user: { $in: studentIds } };
      if (startDate || endDate) {
        leaveQuery.startDate = {};
        if (startDate) leaveQuery.startDate.$gte = new Date(startDate);
        if (endDate) leaveQuery.startDate.$lte = new Date(endDate);
      }
      const allLeaves = await Leave.find(leaveQuery);

      // Group Leaves by user (student) ID
      const leavesMap = new Map();
      for (const l of allLeaves) {
        if (l.user) {
          const uId = l.user.toString();
          if (!leavesMap.has(uId)) {
            leavesMap.set(uId, []);
          }
          leavesMap.get(uId).push(l);
        }
      }

      // 5. Batch Assignment/Submissions fetching
      const allAssignments = await Assignment.find({
        "submissions.student": { $in: studentIds },
      }).populate("course", "name code");

      // Group Assignment records by student ID
      const assignmentsMap = new Map();
      const studentIdStrings = new Set(studentIds.map((id) => id.toString()));
      for (const assign of allAssignments) {
        for (const sub of assign.submissions) {
          if (sub.student) {
            const sId = sub.student.toString();
            if (studentIdStrings.has(sId)) {
              if (!assignmentsMap.has(sId)) {
                assignmentsMap.set(sId, []);
              }
              assignmentsMap.get(sId).push(assign);
            }
          }
        }
      }

      const reportData = [];

      for (const student of students) {
        // Filter student courses in-memory
        const studentCourses = allCourses.filter((c) => {
          const matchesSem = student.semester && c.semester === Number(student.semester);
          const matchesDept = student.course && c.department.toLowerCase() === student.course.toLowerCase();
          return matchesSem || matchesDept;
        });

        // Fetch student attendance records from Map
        const attendance = attendanceMap.get(student._id.toString()) || [];
        const totalClasses = attendance.length;
        const presentClasses = attendance.filter((a) => a.status === "present").length;
        const absentClasses = totalClasses - presentClasses;
        const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

        // Fetch student results records from Map
        const results = resultsMap.get(student._id.toString()) || [];

        // Fetch student leaves records from Map
        const leaves = leavesMap.get(student._id.toString()) || [];

        // Fetch student assignment submissions from Map
        const assignments = assignmentsMap.get(student._id.toString()) || [];
        const submissions = [];
        for (const assign of assignments) {
          const sub = assign.submissions.find(
            (s) => s.student && s.student.toString() === student._id.toString()
          );
          if (sub) {
            submissions.push({
              title: assign.title,
              course: assign.course ? assign.course.name : "N/A",
              dueDate: assign.dueDate,
              submittedAt: sub.submittedAt,
              marks: sub.marks,
            });
          }
        }

        reportData.push({
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone || "N/A",
          studentId: student.studentId,
          course: student.course,
          semester: student.semester,
          courses: studentCourses.map((c) => ({
            name: c.name,
            code: c.code,
            teacher: c.teacher ? c.teacher.name : "Unassigned",
          })),
          attendance: {
            total: totalClasses,
            present: presentClasses,
            absent: absentClasses,
            percentage: attendancePercentage,
            records: attendance.map((a) => ({
              date: a.date,
              status: a.status,
              course: a.course ? a.course.name : "N/A",
            })),
          },
          results: results.map((r) => ({
            course: r.courseId ? r.courseId.name : "N/A",
            code: r.courseId ? r.courseId.code : "N/A",
            internalMarks: r.internalMarks || 0,
            externalMarks: r.externalMarks || 0,
            practicalMarks: r.practicalMarks || 0,
            totalMarks: r.totalMarks || 0,
            grade: r.grade || "N/A",
            status: r.status,
          })),
          leaves: leaves.map((l) => ({
            startDate: l.startDate,
            endDate: l.endDate,
            reason: l.reason,
            status: l.status,
            type: l.type,
          })),
          submissions,
        });
      }

      return res.json({ type: "student", data: reportData });
    } else {
      // Teacher reports
      const teacherQuery = { role: "teacher" };

      if (userId) {
        teacherQuery._id = userId;
      }
      if (department) {
        teacherQuery.department = { $regex: department, $options: "i" };
      }

      const teachers = await User.find(teacherQuery).select(
        "name email phone teacherId department"
      );

      const teacherIds = teachers.map((t) => t._id);

      // 1. Batch Courses taught fetching
      const allTaughtCourses = await Course.find({ teacher: { $in: teacherIds } });
      const taughtCoursesMap = new Map();
      for (const course of allTaughtCourses) {
        if (course.teacher) {
          const tId = course.teacher.toString();
          if (!taughtCoursesMap.has(tId)) {
            taughtCoursesMap.set(tId, []);
          }
          taughtCoursesMap.get(tId).push(course);
        }
      }

      // 2. Batch Teacher Attendance fetching
      const teacherAttQuery = { teacher: { $in: teacherIds } };
      if (startDate || endDate) {
        teacherAttQuery.date = {};
        if (startDate) teacherAttQuery.date.$gte = new Date(startDate);
        if (endDate) teacherAttQuery.date.$lte = new Date(endDate);
      }
      const allTeacherAttendance = await TeacherAttendance.find(teacherAttQuery);
      const teacherAttendanceMap = new Map();
      for (const att of allTeacherAttendance) {
        if (att.teacher) {
          const tId = att.teacher.toString();
          if (!teacherAttendanceMap.has(tId)) {
            teacherAttendanceMap.set(tId, []);
          }
          teacherAttendanceMap.get(tId).push(att);
        }
      }

      // 3. Batch Leaves fetching
      const teacherLeaveQuery = { user: { $in: teacherIds } };
      if (startDate || endDate) {
        teacherLeaveQuery.startDate = {};
        if (startDate) teacherLeaveQuery.startDate.$gte = new Date(startDate);
        if (endDate) teacherLeaveQuery.startDate.$lte = new Date(endDate);
      }
      const allTeacherLeaves = await Leave.find(teacherLeaveQuery);
      const teacherLeavesMap = new Map();
      for (const leave of allTeacherLeaves) {
        if (leave.user) {
          const uId = leave.user.toString();
          if (!teacherLeavesMap.has(uId)) {
            teacherLeavesMap.set(uId, []);
          }
          teacherLeavesMap.get(uId).push(leave);
        }
      }

      // 4. Batch Salary fetching
      const allSalaries = await Salary.find({ staff: { $in: teacherIds } });
      const salariesMap = new Map();
      for (const sal of allSalaries) {
        if (sal.staff) {
          const sId = sal.staff.toString();
          if (!salariesMap.has(sId)) {
            salariesMap.set(sId, []);
          }
          salariesMap.get(sId).push(sal);
        }
      }

      const reportData = [];

      for (const teacher of teachers) {
        const taughtCourses = taughtCoursesMap.get(teacher._id.toString()) || [];

        const attendance = teacherAttendanceMap.get(teacher._id.toString()) || [];
        const totalDays = attendance.length;
        const presentDays = attendance.filter((a) => a.status === "Present").length;
        const absentDays = attendance.filter((a) => a.status === "Absent").length;
        const lateDays = attendance.filter((a) => a.status === "Late").length;
        // count late as half present
        const attendancePercentage = totalDays > 0 ? Math.round(((presentDays + lateDays * 0.5) / totalDays) * 100) : 0;

        const leaves = teacherLeavesMap.get(teacher._id.toString()) || [];

        const salaries = salariesMap.get(teacher._id.toString()) || [];

        reportData.push({
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone || "N/A",
          teacherId: teacher.teacherId,
          department: teacher.department,
          courses: taughtCourses.map((c) => ({
            name: c.name,
            code: c.code,
            semester: c.semester,
          })),
          attendance: {
            total: totalDays,
            present: presentDays,
            absent: absentDays,
            late: lateDays,
            percentage: attendancePercentage,
            records: attendance.map((a) => ({
              date: a.date,
              status: a.status,
            })),
          },
          leaves: leaves.map((l) => ({
            startDate: l.startDate,
            endDate: l.endDate,
            reason: l.reason,
            status: l.status,
            type: l.type,
          })),
          salaries: salaries.map((s) => ({
            total: s.total,
            paid: s.paid,
            status: s.status,
            dueDate: s.dueDate,
          })),
        });
      }

      return res.json({ type: "teacher", data: reportData });
    }
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: "Failed to generate report" });
  }
};
