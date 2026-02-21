import TeacherAttendance from "../models/TeacherAttendance.js";

export const markTeacherAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    for (const r of records) {
      await TeacherAttendance.findOneAndUpdate(
        {
          teacher: r.teacherId,
          date,
        },
        {
          status: r.status,
        },
        { upsert: true, new: true },
      );
    }
    res.json({ message: "Teacher attendance saved" });
  } catch (err) {
    res.status(500).json({ message: "Teacher attendance failed" });
  }
};
