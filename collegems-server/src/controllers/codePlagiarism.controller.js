import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Assignment from "../models/Assignment.model.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ASSIGNMENTS_DIR = path.join(process.cwd(), "uploads", "assignments");

const CODE_EXTS = new Set([
  ".py",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".java",
  ".cpp",
  ".cc",
  ".cxx",
  ".c",
  ".h",
  ".hpp",
]);

const EXT_TO_LANG = {
  ".py": "python",
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "javascript",
  ".tsx": "javascript",
  ".java": "java",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".c": "cpp",
  ".h": "cpp",
  ".hpp": "cpp",
};

function resolveFilePath(file) {
  if (!file) return null;
  if (typeof file === "string") {
    const candidates = [
      path.join(ASSIGNMENTS_DIR, path.basename(file)),
      path.resolve(file),
      path.join(process.cwd(), file),
    ];
    return candidates.find((p) => fs.existsSync(p)) || null;
  }
  if (typeof file === "object") {
    if (file.path && fs.existsSync(path.resolve(file.path))) {
      return path.resolve(file.path);
    }
    if (file.filename) {
      const p = path.join(ASSIGNMENTS_DIR, file.filename);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function detectLanguage(filePath, originalName = "", explicit) {
  if (explicit) return String(explicit).toLowerCase();
  const ext =
    path.extname(originalName || "").toLowerCase() ||
    path.extname(filePath || "").toLowerCase();
  return EXT_TO_LANG[ext] || "python";
}

export async function extractSubmissionSourceCode(submission) {
  let code = "";
  let language = "python";
  let filename = "";

  if (submission.file) {
    const filePath = resolveFilePath(submission.file);
    const originalName =
      typeof submission.file === "object"
        ? submission.file.originalname ||
          submission.file.originalName ||
          submission.file.filename ||
          ""
        : path.basename(String(submission.file));
    filename = originalName || (filePath ? path.basename(filePath) : "");
    const ext = path.extname(filename || filePath || "").toLowerCase();

    if (filePath && (CODE_EXTS.has(ext) || !ext)) {
      try {
        code = fs.readFileSync(filePath, "utf-8");
        language = detectLanguage(filePath, filename, submission.language);
      } catch {
        code = "";
      }
    }
  }

  const inline =
    submission.textResponse ||
    submission.content ||
    submission.text ||
    submission.answer ||
    submission.code;
  if ((!code || code.trim().length < 10) && typeof inline === "string" && inline.trim()) {
    code = inline;
    language = detectLanguage(filename, filename, submission.language);
  }

  return {
    code: code || "",
    language,
    filename,
  };
}

async function callMlAnalyze(body) {
  const response = await fetch(`${ML_SERVICE_URL}/analyze/code-plagiarism`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    const err = new Error(detail || "ML service error");
    err.status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Analyze an assignment's programming submissions via the ML AST engine.
 */
export const runCodePlagiarismAnalysis = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const threshold = Number(req.body?.threshold ?? 0.35);
    const k = Number(req.body?.k ?? 5);
    const window = Number(req.body?.window ?? 4);

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment ID" });
    }

    const assignment = await Assignment.findById(assignmentId).populate(
      "submissions.student",
      "name studentId",
    );
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    if (!assignment.submissions?.length) {
      return res.status(400).json({ message: "This assignment has no submissions yet" });
    }

    const submissions = [];
    for (const submission of assignment.submissions) {
      const { code, language, filename } = await extractSubmissionSourceCode(submission);
      if (!code || code.trim().length < 10) continue;
      const student = submission.student;
      const sid = String(student?._id || submission.student || "");
      submissions.push({
        id: sid,
        label: student?.name || student?.studentId || sid,
        studentId: sid,
        studentName: student?.name || "Unknown",
        code,
        language,
        filename,
      });
    }

    if (submissions.length < 2) {
      return res.status(400).json({
        message:
          "Need at least two readable code submissions (.py, .js, .java, .cpp, or inline code).",
        readableCount: submissions.length,
      });
    }

    const analysis = await callMlAnalyze({
      submissions,
      threshold,
      k,
      window,
    });

    res.json({
      assignmentId,
      assignmentTitle: assignment.title,
      ...analysis,
    });
  } catch (err) {
    console.error("Code plagiarism analysis error:", err);
    const status = err.status && Number(err.status) < 600 ? Number(err.status) : 502;
    res.status(status).json({
      message:
        status === 502
          ? "Code plagiarism ML service is unavailable. Ensure collegems-ml-service is running."
          : err.message || "Failed to analyze code plagiarism",
    });
  }
};

/**
 * Analyze an arbitrary list of code snippets (manual / demo uploads).
 */
export const analyzeCodeSnippets = async (req, res) => {
  try {
    const submissions = req.body?.submissions;
    if (!Array.isArray(submissions) || submissions.length < 2) {
      return res.status(400).json({ message: "Provide at least two code submissions" });
    }

    const normalized = submissions.map((s, idx) => ({
      id: String(s.id || s.studentId || `sub-${idx + 1}`),
      label: s.label || s.studentName || `Submission ${idx + 1}`,
      code: s.code || s.source || "",
      language: s.language || "python",
      filename: s.filename,
    }));

    if (normalized.some((s) => !s.code?.trim())) {
      return res.status(400).json({ message: "Each submission must include non-empty code" });
    }

    const analysis = await callMlAnalyze({
      submissions: normalized,
      threshold: Number(req.body?.threshold ?? 0.35),
      k: Number(req.body?.k ?? 5),
      window: Number(req.body?.window ?? 4),
    });

    res.json(analysis);
  } catch (err) {
    console.error("Code snippet plagiarism error:", err);
    const status = err.status && Number(err.status) < 600 ? Number(err.status) : 502;
    res.status(status).json({
      message:
        status === 502
          ? "Code plagiarism ML service is unavailable. Ensure collegems-ml-service is running."
          : err.message || "Failed to analyze code",
    });
  }
};
