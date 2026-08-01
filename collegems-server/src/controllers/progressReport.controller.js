import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Attendance from "../models/Attendance.model.js";
import Results from "../models/Results.model.js";
import Assignment from "../models/Assignment.model.js";
import EventAttendance from "../models/EventAttendance.model.js";
import Mentorship from "../models/Mentorship.model.js";
import StudentAnalytics from "../models/StudentAnalytics.model.js";

const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));

const gradeToPoints = (grade) => {
  const map = {
    "A+": 10,
    A: 9,
    "B+": 8,
    B: 7,
    "C+": 6,
    C: 5,
    D: 4,
    F: 0,
  };
  if (!grade) return null;
  return map[String(grade).toUpperCase()] ?? null;
};

const buildAiRemarks = ({ metrics, analytics, student }) => {
  const remarks = [];

  if (analytics?.recommendedInterventions?.length) {
    remarks.push(...analytics.recommendedInterventions.slice(0, 3));
  }

  if (metrics.attendance < 75) {
    remarks.push(
      "Attendance is below the recommended threshold. Encourage consistent class participation."
    );
  } else if (metrics.attendance >= 90) {
    remarks.push("Excellent attendance discipline demonstrated this term.");
  }

  if (metrics.academics < 50) {
    remarks.push(
      "Academic performance needs focused improvement. Consider remedial support sessions."
    );
  } else if (metrics.academics >= 80) {
    remarks.push("Strong academic standing with competitive semester outcomes.");
  }

  if (metrics.assignments < 60) {
    remarks.push(
      "Assignment completion is irregular. Set weekly submission checkpoints."
    );
  } else if (metrics.assignments >= 85) {
    remarks.push("Reliable assignment submission habits observed.");
  }

  if (metrics.extraCurriculars < 40) {
    remarks.push(
      "Limited extracurricular engagement. Recommend club or event participation."
    );
  }

  if (analytics?.riskLevel === "high") {
    remarks.push(
      `AI warning: elevated dropout risk (${Math.round(
        (analytics.dropoutRiskScore || 0) * 100
      )}%). Prioritize mentoring and parent outreach.`
    );
  } else if (analytics?.riskLevel === "medium") {
    remarks.push(
      "AI notice: moderate performance risk detected. Monitor progress bi-weekly."
    );
  }

  if (!remarks.length) {
    remarks.push(
      `${student.name} shows balanced progress across academics and engagement metrics.`
    );
  }

  return [...new Set(remarks)].slice(0, 6);
};

const computeStudentMetrics = async (student) => {
  const studentId = student._id;

  const courseQuery = {
    $or: [
      ...(student.semester
        ? [{ semester: Number(student.semester) }]
        : []),
      ...(student.course
        ? [{ department: { $regex: `^${student.course}$`, $options: "i" } }]
        : []),
    ],
  };

  const relatedCourses =
    courseQuery.$or.length > 0
      ? await Course.find(courseQuery).select("_id")
      : [];
  const courseIds = relatedCourses.map((c) => c._id);

  const [attendanceDocs, results, assignments, eventCheckIns, mentorship] =
    await Promise.all([
      Attendance.find({ student: studentId }).select("status"),
      Results.find({
        studentId,
        $or: [{ status: "published" }, { status: { $exists: false } }],
      }).populate("courseId", "name code"),
      Assignment.find(
        courseIds.length ? { course: { $in: courseIds } } : {}
      ).select("title dueDate totalPoints submissions"),
      EventAttendance.countDocuments({
        participant: studentId,
        status: "checked-in",
      }),
      Mentorship.findOne({ mentee: studentId, status: "active" }),
    ]);

  const attendanceTotal = attendanceDocs.length;
  const attendancePresent = attendanceDocs.filter(
    (a) => a.status === "present"
  ).length;
  const attendance =
    attendanceTotal === 0
      ? 100
      : clamp((attendancePresent / attendanceTotal) * 100);

  let academics = 50;
  let semesterGpa = null;
  if (results.length > 0) {
    const scored = results.map((r) => {
      const fromGrade = gradeToPoints(r.grade);
      if (fromGrade !== null) return (fromGrade / 10) * 100;
      const total = Number(r.totalMarks) || 0;
      return clamp((total / 300) * 100);
    });
    academics = clamp(
      scored.reduce((sum, v) => sum + v, 0) / scored.length
    );
    const gpaValues = results
      .map((r) => gradeToPoints(r.grade))
      .filter((v) => v !== null);
    if (gpaValues.length) {
      semesterGpa = Number(
        (gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length).toFixed(2)
      );
    } else {
      semesterGpa = Number(((academics / 100) * 10).toFixed(2));
    }
  }

  const assignedCount = assignments.length;
  let submittedCount = 0;
  let gradedScoreSum = 0;
  let gradedCount = 0;

  for (const assignment of assignments) {
    const submission = assignment.submissions?.find(
      (s) => s.student?.toString() === studentId.toString()
    );
    if (!submission) continue;
    if (
      ["submitted", "graded", "draft"].includes(submission.status) ||
      submission.submittedAt
    ) {
      if (submission.status !== "draft") submittedCount += 1;
      else if (submission.submittedAt) submittedCount += 1;
    }
    if (typeof submission.marks === "number" && assignment.totalPoints) {
      gradedScoreSum += (submission.marks / assignment.totalPoints) * 100;
      gradedCount += 1;
    }
  }

  const assignmentsScore =
    assignedCount === 0
      ? 60
      : clamp((submittedCount / assignedCount) * 100);

  const extraCurriculars = clamp(Math.min(100, 20 + eventCheckIns * 16));

  let softSkills = 55;
  if (mentorship) softSkills += 12;
  softSkills += Math.min(18, eventCheckIns * 4);
  if (gradedCount > 0) {
    softSkills += Math.min(15, (gradedScoreSum / gradedCount) * 0.15);
  }
  softSkills = clamp(softSkills);

  const resultSummary = results.map((r) => ({
    course: r.courseId?.name || "Course",
    code: r.courseId?.code || "",
    grade: r.grade || "N/A",
    totalMarks: r.totalMarks ?? 0,
    internalMarks: r.internalMarks ?? 0,
    externalMarks: r.externalMarks ?? 0,
  }));

  return {
    metrics: {
      academics: Math.round(academics * 10) / 10,
      attendance: Math.round(attendance * 10) / 10,
      assignments: Math.round(assignmentsScore * 10) / 10,
      extraCurriculars: Math.round(extraCurriculars * 10) / 10,
      softSkills: Math.round(softSkills * 10) / 10,
    },
    details: {
      semesterGpa,
      attendancePresent,
      attendanceTotal,
      assignmentsSubmitted: submittedCount,
      assignmentsTracked: assignedCount,
      eventCheckIns,
      hasMentor: Boolean(mentorship),
      results: resultSummary,
    },
  };
};

export const listProgressReportStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student", accountStatus: "active" })
      .select("name email studentId semester course")
      .sort({ name: 1 });

    res.json({ success: true, data: students });
  } catch (error) {
    console.error("listProgressReportStudents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load students for progress reports",
    });
  }
};

export const getStudentProgressReport = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId).select(
      "name email phone studentId semester course role accountStatus"
    );

    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const { metrics, details } = await computeStudentMetrics(student);

    const peers = await User.find({
      role: "student",
      semester: student.semester,
      ...(student.course ? { course: student.course } : {}),
      _id: { $ne: student._id },
    }).select("_id");

    const peerSample = peers.slice(0, 12);
    const classTotals = {
      academics: metrics.academics,
      attendance: metrics.attendance,
      assignments: metrics.assignments,
      extraCurriculars: metrics.extraCurriculars,
      softSkills: metrics.softSkills,
    };
    let peerCount = 1;

    const peerUsers = await User.find({
      _id: { $in: peerSample.map((p) => p._id) },
    });
    const peerMetricResults = await Promise.all(
      peerUsers.map((peerUser) => computeStudentMetrics(peerUser))
    );
    for (const { metrics: peerMetrics } of peerMetricResults) {
      classTotals.academics += peerMetrics.academics;
      classTotals.attendance += peerMetrics.attendance;
      classTotals.assignments += peerMetrics.assignments;
      classTotals.extraCurriculars += peerMetrics.extraCurriculars;
      classTotals.softSkills += peerMetrics.softSkills;
      peerCount += 1;
    }

    const classAverage = {
      academics: Math.round((classTotals.academics / peerCount) * 10) / 10,
      attendance: Math.round((classTotals.attendance / peerCount) * 10) / 10,
      assignments: Math.round((classTotals.assignments / peerCount) * 10) / 10,
      extraCurriculars:
        Math.round((classTotals.extraCurriculars / peerCount) * 10) / 10,
      softSkills: Math.round((classTotals.softSkills / peerCount) * 10) / 10,
    };

    let analytics = await StudentAnalytics.findOne({ studentId: student._id });
    if (!analytics) {
      analytics = {
        riskLevel: metrics.academics < 50 || metrics.attendance < 75 ? "medium" : "low",
        dropoutRiskScore:
          metrics.academics < 50 || metrics.attendance < 75 ? 0.45 : 0.15,
        predictedPerformance:
          metrics.academics >= 80 ? "A" : metrics.academics >= 60 ? "B" : "C",
        recommendedInterventions: [],
      };
    }

    const aiRemarks = buildAiRemarks({ metrics, analytics, student });

    const radarData = [
      {
        metric: "Academics",
        student: metrics.academics,
        classAverage: classAverage.academics,
      },
      {
        metric: "Attendance",
        student: metrics.attendance,
        classAverage: classAverage.attendance,
      },
      {
        metric: "Assignments",
        student: metrics.assignments,
        classAverage: classAverage.assignments,
      },
      {
        metric: "Extra-curriculars",
        student: metrics.extraCurriculars,
        classAverage: classAverage.extraCurriculars,
      },
      {
        metric: "Soft Skills",
        student: metrics.softSkills,
        classAverage: classAverage.softSkills,
      },
    ];

    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        college: {
          name: process.env.COLLEGE_NAME || "Smart College of Engineering",
          sealLabel: "OFFICIAL",
        },
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          studentId: student.studentId,
          semester: student.semester,
          course: student.course,
        },
        summary: {
          semesterGpa: details.semesterGpa,
          attendancePercentage: metrics.attendance,
          assignmentCompletionRate: metrics.assignments,
          overallScore:
            Math.round(
              ((metrics.academics +
                metrics.attendance +
                metrics.assignments +
                metrics.extraCurriculars +
                metrics.softSkills) /
                5) *
                10
            ) / 10,
        },
        metrics,
        classAverage,
        radarData,
        details,
        aiInsights: {
          riskLevel: analytics.riskLevel || "low",
          dropoutRiskScore: analytics.dropoutRiskScore ?? 0,
          predictedPerformance: analytics.predictedPerformance || "N/A",
          remarks: aiRemarks,
        },
      },
    });
  } catch (error) {
    console.error("getStudentProgressReport:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate student progress report",
    });
  }
};
