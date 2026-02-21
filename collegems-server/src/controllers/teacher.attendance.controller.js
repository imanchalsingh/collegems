// controllers/teacher.attendance.controller.js
import TeacherAttendance from "../models/TeacherAttendance.js";
import User from "../models/User.model.js"; // Assuming Teacher is a type of User

// For teachers to mark their own attendance
export const markMyAttendance = async (req, res) => {
  try {
    const { date, status } = req.body;
    const teacherId = req.user.id;

    // Validate status
    if (!["Present", "Absent", "Late"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Check if attendance already marked for today
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await TeacherAttendance.findOne({
      teacher: teacherId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      existingAttendance.markedBy = req.user.id;
      existingAttendance.markedAt = new Date();
      await existingAttendance.save();

      return res.json({
        message: "Attendance updated successfully",
        attendance: existingAttendance,
      });
    }

    // Create new attendance record
    const attendance = await TeacherAttendance.create({
      teacher: req.user.id,
      date: startOfDay,
      status,
      markedBy: req.user.id,
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (err) {
    console.error("Error marking attendance:", err);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
};

// For teachers to get their own attendance history
export const getMyAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { month, year } = req.query;

    let query = { teacher: teacherId };

    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await TeacherAttendance.find(query)
      .sort({ date: -1 })
      .populate("teacher", "name email department");

    res.json(attendance);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
};

// For HOD to get all teachers' attendance
export const getAllTeachersAttendance = async (req, res) => {
  try {
    const { date, startDate, endDate, month, year } = req.query;

    let query = {};

    // Date filtering
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(searchDate);
      nextDate.setDate(nextDate.getDate() + 1);

      query.date = {
        $gte: searchDate,
        $lt: nextDate,
      };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const attendance = await TeacherAttendance.find(query)
      .sort({ date: -1 })
      .populate("teacher", "name email department")
      .populate("markedBy", "name role");

    res.json(attendance);
  } catch (err) {
    console.error("Error fetching all attendance:", err);
    res.status(500).json({ message: "Failed to fetch attendance data" });
  }
};

// For HOD to get attendance statistics
export const getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};

    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await TeacherAttendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get total teachers count
    const totalTeachers = await User.countDocuments();

    // Get department-wise stats
    const deptStats = await TeacherAttendance.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "teachers",
          localField: "teacher",
          foreignField: "_id",
          as: "teacherInfo",
        },
      },
      { $unwind: "$teacherInfo" },
      {
        $group: {
          _id: {
            department: "$teacherInfo.department",
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Format department stats
    const departmentWise = {};
    deptStats.forEach((item) => {
      const dept = item._id.department || "Other";
      if (!departmentWise[dept]) {
        departmentWise[dept] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      departmentWise[dept][item._id.status.toLowerCase()] = item.count;
      departmentWise[dept].total += item.count;
    });

    const formattedStats = {
      present: stats.find((s) => s._id === "Present")?.count || 0,
      absent: stats.find((s) => s._id === "Absent")?.count || 0,
      late: stats.find((s) => s._id === "Late")?.count || 0,
      totalTeachers,
      departmentWise,
    };

    res.json(formattedStats);
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
};
