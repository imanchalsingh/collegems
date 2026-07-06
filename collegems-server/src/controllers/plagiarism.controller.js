import mongoose from "mongoose";
import Assignment from "../models/Assignment.model.js";
import PlagiarismReport from "../models/PlagiarismReport.model.js";
import PlagiarismAppeal from "../models/PlagiarismAppeal.model.js";
import { getSubmissionText } from "../utils/textExtraction.js";
import { compareTexts } from "../utils/similarity.js";

const DEFAULT_THRESHOLD = 40; // similarity % at/above which a submission is flagged
const MIN_REPORTED_SIMILARITY = 1; // don't bother reporting near-zero overlaps

const academicYearOf = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  return month >= 7 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
};

/**
 * Find assignments from previous academic years that this check should be
 * compared against. Heuristic: same course OR same (normalized) title,
 * created by any teacher, excluding the current assignment, and with a
 * createdAt strictly before the current assignment's createdAt.
 */
const findPriorYearAssignments = async (assignment) => {
  const normalizedTitle = assignment.title?.trim().toLowerCase();

  const candidates = await Assignment.find({
    _id: { $ne: assignment._id },
    createdAt: { $lt: assignment.createdAt },
    $or: [
      { course: assignment.course },
      ...(normalizedTitle ? [{ title: new RegExp(`^${escapeRegExp(normalizedTitle)}$`, "i") }] : []),
    ],
  })
    .select("title course createdAt submissions")
    .populate("submissions.student", "name");

  return candidates;
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a flat list of { assignmentId, assignmentTitle, student, studentName,
 * createdAt, text, sourceType } for every submission across the given
 * assignments, with text extracted/resolved.
 */
const buildSubmissionPool = async (assignments) => {
  const pool = [];
  for (const a of assignments) {
    for (const submission of a.submissions || []) {
      const { text, sourceType, extractionNote } = await getSubmissionText(submission);
      pool.push({
        assignmentId: a._id,
        assignmentTitle: a.title,
        assignmentCreatedAt: a.createdAt,
        student: submission.student?._id || submission.student,
        studentName: submission.student?.name || "Unknown student",
        submittedAt: submission.submittedAt,
        text,
        sourceType,
        extractionNote,
      });
    }
  }
  return pool;
};

// ── Teacher/HOD: run a plagiarism check across all submissions for an assignment ──
export const runPlagiarismCheck = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const threshold = Number(req.body?.threshold) || DEFAULT_THRESHOLD;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment ID" });
    }

    const assignment = await Assignment.findById(assignmentId)
      .populate("submissions.student", "name");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (!assignment.submissions || assignment.submissions.length === 0) {
      return res.status(400).json({ message: "This assignment has no submissions yet" });
    }

    // Current assignment's submissions (the ones we're generating reports for)
    const currentPool = await buildSubmissionPool([assignment]);

    // Previous academic years' submissions to compare against
    const priorAssignments = await findPriorYearAssignments(assignment);
    const priorPool = priorAssignments.length
      ? await buildSubmissionPool(priorAssignments)
      : [];

    const reports = [];

    for (const submission of currentPool) {
      const matches = [];

      // ── Compare against other submissions in the same assignment ──
      for (const other of currentPool) {
        if (other.student.toString() === submission.student.toString()) continue;

        const result = compareTexts(submission.text, other.text);
        if (!result || result.similarity < MIN_REPORTED_SIMILARITY) continue;

        matches.push({
          matchType: "same_assignment",
          sourceAssignment: other.assignmentId,
          sourceAssignmentTitle: other.assignmentTitle,
          matchedStudent: other.student,
          matchedStudentName: other.studentName,
          academicYear: academicYearOf(other.assignmentCreatedAt),
          similarityPercentage: result.similarity,
          matchedSections: result.matchedSections,
        });
      }

      // ── Compare against submissions from previous academic years ──
      for (const other of priorPool) {
        const result = compareTexts(submission.text, other.text);
        if (!result || result.similarity < MIN_REPORTED_SIMILARITY) continue;

        matches.push({
          matchType: "previous_year",
          sourceAssignment: other.assignmentId,
          sourceAssignmentTitle: other.assignmentTitle,
          matchedStudent: other.student,
          matchedStudentName: other.studentName,
          academicYear: academicYearOf(other.assignmentCreatedAt),
          similarityPercentage: result.similarity,
          matchedSections: result.matchedSections,
        });
      }

      // Sort matches by similarity desc, keep the most relevant ones
      matches.sort((a, b) => b.similarityPercentage - a.similarityPercentage);
      const topMatches = matches.slice(0, 5);

      const overallSimilarity = topMatches.length ? topMatches[0].similarityPercentage : 0;
      const flagged = overallSimilarity >= threshold;

      const report = await PlagiarismReport.findOneAndUpdate(
        { assignment: assignment._id, student: submission.student },
        {
          assignment: assignment._id,
          student: submission.student,
          sourceType: submission.sourceType,
          extractedCharacterCount: submission.text.length,
          extractionNote: submission.extractionNote || "",
          overallSimilarity,
          threshold,
          flagged,
          matches: topMatches,
          status: "pending_review",
          checkedAt: new Date(),
          // Reset any prior review when re-running the check
          reviewedBy: undefined,
          reviewNotes: "",
          reviewedAt: undefined,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).populate("student", "name email studentId");

      reports.push(report);
    }

    reports.sort((a, b) => b.overallSimilarity - a.overallSimilarity);

    res.json({
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      threshold,
      totalSubmissions: currentPool.length,
      flaggedCount: reports.filter((r) => r.flagged).length,
      comparedAgainstPriorYears: priorAssignments.length,
      reports,
    });
  } catch (err) {
    console.error("Run plagiarism check error:", err);
    res.status(500).json({ message: "Failed to run plagiarism check" });
  }
};

// ── Teacher/HOD: get all reports for an assignment (most recent check) ──
export const getAssignmentReports = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment ID" });
    }

    const reports = await PlagiarismReport.find({ assignment: assignmentId })
      .populate("student", "name email studentId")
      .populate("matches.matchedStudent", "name")
      .populate("reviewedBy", "name")
      .sort({ overallSimilarity: -1 });

    const assignment = await Assignment.findById(assignmentId).select("title dueDate course");

    res.json({ assignment, reports });
  } catch (err) {
    console.error("Get assignment reports error:", err);
    res.status(500).json({ message: "Failed to fetch plagiarism reports" });
  }
};

// ── Teacher/HOD: get a single student's report for an assignment ──
export const getSubmissionReport = async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;

    const report = await PlagiarismReport.findOne({
      assignment: assignmentId,
      student: studentId,
    })
      .populate("student", "name email studentId")
      .populate("matches.matchedStudent", "name")
      .populate("reviewedBy", "name")
      .populate("matches.sourceAssignment", "title");

    if (!report) {
      return res.status(404).json({ message: "No plagiarism report found for this submission" });
    }

    res.json(report);
  } catch (err) {
    console.error("Get submission report error:", err);
    res.status(500).json({ message: "Failed to fetch plagiarism report" });
  }
};

// ── Teacher/HOD: mark a flagged report as reviewed ──
export const reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    const validStatuses = ["reviewed", "cleared", "action_taken"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const report = await PlagiarismReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = status;
    report.reviewNotes = reviewNotes || "";
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();

    await report.populate("student", "name email studentId");
    await report.populate("reviewedBy", "name");

    res.json(report);
  } catch (err) {
    console.error("Review report error:", err);
    res.status(500).json({ message: "Failed to update report" });
  }
};

// ── Student: Submit a plagiarism appeal ──
export const submitAppeal = async (req, res) => {
  try {
    const { reportId, justification } = req.body;
    const studentId = req.user.id;

    if (!justification || !justification.trim()) {
      return res.status(400).json({ message: "Justification is required." });
    }

    const report = await PlagiarismReport.findOne({ _id: reportId, student: studentId });
    if (!report) {
      return res.status(404).json({ message: "Plagiarism report not found." });
    }

    // Check if an appeal already exists
    const existingAppeal = await PlagiarismAppeal.findOne({ reportId });
    if (existingAppeal && existingAppeal.status !== "rejected") {
      return res.status(400).json({ message: "An active appeal already exists for this report." });
    }

    const appeal = await PlagiarismAppeal.create({
      reportId,
      student: studentId,
      assignment: report.assignment,
      justification
    });

    report.status = "pending_review"; 
    await report.save();

    res.status(201).json({ message: "Appeal submitted successfully", appeal });
  } catch (error) {
    console.error("Submit appeal error:", error);
    res.status(500).json({ message: "Failed to submit appeal" });
  }
};

// ── Teacher/HOD: Review a student's appeal ──
export const reviewAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body; // status: "approved" or "rejected"

    const appeal = await PlagiarismAppeal.findById(id).populate("reportId");
    if (!appeal) {
      return res.status(404).json({ message: "Appeal not found." });
    }

    appeal.status = status;
    appeal.reviewedBy = req.user.id;
    appeal.reviewNotes = reviewNotes || "";
    await appeal.save();

    // If approved, clear the flag on the report
    if (status === "approved" && appeal.reportId) {
      appeal.reportId.flagged = false;
      appeal.reportId.status = "cleared";
      appeal.reportId.reviewedBy = req.user.id;
      appeal.reportId.reviewNotes = `Appeal Approved: ${reviewNotes}`;
      await appeal.reportId.save();
    }

    res.json({ message: `Appeal ${status} successfully`, appeal });
  } catch (error) {
    console.error("Review appeal error:", error);
    res.status(500).json({ message: "Failed to review appeal" });
  }
};
