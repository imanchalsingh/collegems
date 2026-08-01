import fs from "fs";
import path from "path";
import httpContext from "express-http-context";
import log from "../utils/logger.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

function correlationHeaders(extra = {}) {
  const correlationId = httpContext.get("correlationId") || "N/A";
  return {
    "X-Correlation-ID": correlationId,
    ...extra,
  };
}

/**
 * Parse resume via ML service — PDF bytes or plain text.
 */
export async function parseResumeWithMl({ filePath, buffer, text, studentId }) {
  const form = new FormData();
  if (studentId) form.append("student_id", studentId);

  if (buffer) {
    form.append("file", new Blob([buffer], { type: "application/pdf" }), "resume.pdf");
  } else if (filePath && fs.existsSync(filePath)) {
    const bytes = fs.readFileSync(filePath);
    form.append("file", new Blob([bytes], { type: "application/pdf" }), path.basename(filePath));
  } else if (text) {
    form.append("text", text);
  } else {
    throw new Error("Provide resume file path, buffer, or text");
  }

  const response = await fetch(`${ML_SERVICE_URL}/parse/resume`, {
    method: "POST",
    headers: correlationHeaders(),
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    log.error("ML resume parse failed", null, { status: response.status, errText });
    throw new Error(`ML parse failed: ${response.status} ${errText}`);
  }
  return response.json();
}

/**
 * Score ATS compatibility via ML service.
 */
export async function scoreAtsWithMl(payload) {
  const response = await fetch(`${ML_SERVICE_URL}/score/ats`, {
    method: "POST",
    headers: correlationHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    log.error("ML ATS score failed", null, { status: response.status, errText });
    throw new Error(`ML ATS score failed: ${response.status} ${errText}`);
  }
  return response.json();
}

/**
 * Offline fallback when ML service is down — keyword overlap only.
 */
export function scoreAtsFallback({ requirements = [], resumeSkills = [], jobText = "" }) {
  const req = requirements.map((r) => String(r).toLowerCase());
  const skills = resumeSkills.map((s) => String(s).toLowerCase());
  const blob = `${jobText} ${skills.join(" ")}`.toLowerCase();
  const matched = req.filter((r) => skills.includes(r) || blob.includes(r));
  const missing = req.filter((r) => !matched.includes(r));
  const ratio = req.length ? matched.length / req.length : 0;
  const ats_score = Math.round(ratio * 100);
  return {
    ats_score,
    match_level: ats_score >= 75 ? "high" : ats_score >= 45 ? "medium" : "low",
    matched_skills: matched,
    missing_skills: missing,
    cosine_similarity: ratio,
    eligible: true,
    eligibility_reasons: [],
    fallback: true,
  };
}
