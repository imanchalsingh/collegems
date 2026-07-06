import Results from "../models/Results.model.js";
import Course from "../models/Course.model.js";

/**
 * @desc Get grade trend data for a student
 * @route GET /api/analytics/student/:studentId/grade-trend
 * @access Private (student or HOD/teacher)
 */
export const getStudentGradeTrend = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semester, subject } = req.query; // optional filters
    // Basic validation
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    const match = { studentId };
    if (semester) match.semester = semester;
    if (subject) match.courseId = subject; // expecting subject to be courseId

    // Fetch results and populate course name for labeling
    const results = await Results.find(match)
      .populate({ path: "courseId", select: "name code" })
      .sort({ createdAt: 1 }) // chronological
      .lean();

    const formatted = results.map((r) => ({
      date: r.createdAt,
      course: r.courseId?.name || "Unknown",
      internal: r.internalMarks ?? 0,
      external: r.externalMarks ?? 0,
      practical: r.practicalMarks ?? 0,
      total: r.totalMarks ?? 0,
      grade: r.grade || "-",
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching grade trend:", error);
    res.status(500).json({ success: false, message: "Server error fetching grades" });
  }
};
