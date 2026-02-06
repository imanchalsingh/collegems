import Attendance from "../models/Attendance.model.js";

export const markAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;

    for (const r of records) {
      await Attendance.findOneAndUpdate(
        {
          student: r.studentId,
          date,
        },
        {
          status: r.status,
        },
        { upsert: true, new: true },
      );
    }

    res.json({ message: "Attendance saved" });
  } catch (err) {
    res.status(500).json({ message: "Attendance failed" });
  }
};

export const getMyAttendance = async (req, res) => {
  const data = await Attendance.find({
    student: req.user.id,
  }).populate("course", "name");

  res.json(data);
};
