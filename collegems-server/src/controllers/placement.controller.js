import PlacementDrive from "../models/PlacementDrive.model.js";
import User from "../models/User.model.js";
import JobPosting from "../models/JobPosting.model.js";
import path from "path";
import fs from "fs";
import {
  parseResumeWithMl,
  scoreAtsWithMl,
  scoreAtsFallback,
} from "../services/placementAts.service.js";

// HOD creates a placement drive
export const createPlacementDrive = async (req, res) => {
  try {
    const {
      companyName, role, description,
      eligibility, driveDate, lastDateToApply
    } = req.body;

    const drive = await PlacementDrive.create({
      companyName,
      role,
      description,
      eligibility,
      driveDate,
      lastDateToApply,
      createdBy: req.user.id,
    });

    res.status(201).json(drive);
  } catch (error) {
    console.error("Error creating placement drive:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all placement drives
export const getPlacementDrives = async (req, res) => {
  try {
    const drives = await PlacementDrive.find()
      .sort({ createdAt: -1 });
    res.json(drives);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Check eligible students for a drive
export const getEligibleStudents = async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ message: "Drive not found" });
    }

    const { minCGPA, maxBacklogs, allowedBranches, graduationYear } =
      drive.eligibility;

    const students = await User.find({ role: "student" }).select("-password");

    const eligible = students.filter((s) => {
      if (minCGPA && (s.cgpa || 0) < minCGPA) return false;
      if (maxBacklogs !== undefined && (s.backlogs || 0) > maxBacklogs)
        return false;
      if (allowedBranches?.length > 0 && !allowedBranches.includes(s.course))
        return false;
      return true;
    });

    res.json({ drive, eligibleStudents: eligible });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Student checks their own eligibility
export const checkMyEligibility = async (req, res) => {
  try {
    const drives = await PlacementDrive.find({ status: { $ne: "closed" } });
    const student = await User.findById(req.user.id);

    const result = drives.map((drive) => {
      const { minCGPA, maxBacklogs, allowedBranches } = drive.eligibility;
      let eligible = true;
      const reasons = [];

      if (minCGPA && (student.cgpa || 0) < minCGPA) {
        eligible = false;
        reasons.push(`Minimum CGPA required: ${minCGPA}`);
      }
      if (maxBacklogs !== undefined && (student.backlogs || 0) > maxBacklogs) {
        eligible = false;
        reasons.push(`Maximum backlogs allowed: ${maxBacklogs}`);
      }
      if (allowedBranches?.length > 0 && !allowedBranches.includes(student.course)) {
        eligible = false;
        reasons.push(`Branch not eligible`);
      }

      return { drive, eligible, reasons };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

function resolveResumePath(resumeUrl) {
  if (!resumeUrl) return null;
  const candidates = [
    path.join(process.cwd(), resumeUrl),
    path.join(process.cwd(), "secure-uploads", "resumes", path.basename(resumeUrl)),
    path.join(process.cwd(), "uploads", "resumes", path.basename(resumeUrl)),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/**
 * Parse an uploaded resume PDF (multipart) via ML service.
 * POST /api/placements/ats/parse
 */
export const parseResumeAts = async (req, res) => {
  try {
    let parsed;
    if (req.file?.buffer || req.file?.path) {
      parsed = await parseResumeWithMl({
        buffer: req.file.buffer,
        filePath: req.file.path,
        studentId: req.user.id,
      });
    } else if (req.body?.text) {
      parsed = await parseResumeWithMl({
        text: req.body.text,
        studentId: req.user.id,
      });
    } else if (req.user.role === "student") {
      const student = await User.findById(req.user.id);
      const filePath = resolveResumePath(student?.resumeUrl);
      if (!filePath) {
        return res.status(400).json({
          message: "No resume on file — upload a PDF resume first",
        });
      }
      parsed = await parseResumeWithMl({
        filePath,
        studentId: req.user.id,
      });
    } else {
      return res.status(400).json({ message: "Provide a PDF file or text" });
    }
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error("ATS parse error:", error);
    res.status(502).json({
      message: error.message || "ML resume parse failed",
    });
  }
};

/**
 * Score a single resume against job/drive requirements.
 * POST /api/placements/ats/score
 */
export const scoreResumeAts = async (req, res) => {
  try {
    const {
      jobId,
      driveId,
      requirements,
      jobText,
      resume,
      rawText,
      studentId,
    } = req.body;

    let reqs = requirements || [];
    let text = jobText || "";
    let minCGPA;
    let maxBacklogs;

    if (jobId) {
      const job = await JobPosting.findById(jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      reqs = job.requirements || reqs;
      text = `${job.title} ${job.company} ${job.description} ${text}`;
    }

    if (driveId) {
      const drive = await PlacementDrive.findById(driveId);
      if (!drive) return res.status(404).json({ message: "Drive not found" });
      text = `${drive.companyName} ${drive.role} ${drive.description || ""} ${text}`;
      minCGPA = drive.eligibility?.minCGPA;
      maxBacklogs = drive.eligibility?.maxBacklogs;
      if (!reqs.length && drive.role) reqs = [drive.role];
    }

    let resumePayload = resume;
    let student = null;
    if (studentId || req.user.role === "student") {
      student = await User.findById(studentId || req.user.id);
      if (!resumePayload && student?.resumeUrl) {
        const filePath = resolveResumePath(student.resumeUrl);
        if (filePath) {
          try {
            resumePayload = await parseResumeWithMl({
              filePath,
              studentId: student._id.toString(),
            });
          } catch {
            /* fall through */
          }
        }
      }
    }

    let score;
    try {
      score = await scoreAtsWithMl({
        job_id: jobId || driveId || null,
        requirements: reqs,
        job_text: text,
        resume: resumePayload || null,
        raw_text: rawText || null,
        min_cgpa: minCGPA,
        max_backlogs: maxBacklogs,
        student_cgpa: student?.cgpa ?? null,
        student_backlogs: student?.backlogs ?? null,
      });
    } catch {
      score = scoreAtsFallback({
        requirements: reqs,
        resumeSkills: resumePayload?.skills || [],
        jobText: text,
      });
    }

    res.json({ success: true, data: score });
  } catch (error) {
    console.error("ATS score error:", error);
    res.status(500).json({ message: error.message || "ATS scoring failed" });
  }
};

/**
 * Bulk shortlist eligible students for a drive with ATS scores + CSV export.
 * POST /api/placements/:id/shortlist
 */
export const shortlistDriveCandidates = async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: "Drive not found" });

    const minAts = Number(req.body.min_ats_score ?? req.body.minAtsScore ?? 60);
    const enforceEligibility = req.body.enforce_eligibility !== false;
    const limit = Math.min(Number(req.body.limit) || 100, 500);

    const { minCGPA, maxBacklogs, allowedBranches } = drive.eligibility || {};
    const students = await User.find({ role: "student" }).select("-password");

    const jobText = `${drive.companyName} ${drive.role} ${drive.description || ""}`;
    const requirements = [drive.role, ...(req.body.requirements || [])].filter(Boolean);

    const shortlisted = [];

    for (const student of students) {
      const reasons = [];
      let eligible = true;

      if (enforceEligibility) {
        if (minCGPA && (student.cgpa || 0) < minCGPA) {
          eligible = false;
          reasons.push(`CGPA below ${minCGPA}`);
        }
        if (maxBacklogs !== undefined && (student.backlogs || 0) > maxBacklogs) {
          eligible = false;
          reasons.push(`Backlogs above ${maxBacklogs}`);
        }
        if (allowedBranches?.length && !allowedBranches.includes(student.course)) {
          eligible = false;
          reasons.push("Branch not allowed");
        }
      }

      if (!eligible && enforceEligibility) continue;

      let resumePayload = null;
      const filePath = resolveResumePath(student.resumeUrl);
      if (filePath) {
        try {
          resumePayload = await parseResumeWithMl({
            filePath,
            studentId: student._id.toString(),
          });
        } catch {
          resumePayload = { skills: [] };
        }
      } else {
        resumePayload = { skills: [] };
      }

      let score;
      try {
        score = await scoreAtsWithMl({
          job_id: drive._id.toString(),
          requirements,
          job_text: jobText,
          resume: resumePayload,
          min_cgpa: minCGPA,
          max_backlogs: maxBacklogs,
          student_cgpa: student.cgpa ?? null,
          student_backlogs: student.backlogs ?? null,
        });
      } catch {
        score = scoreAtsFallback({
          requirements,
          resumeSkills: resumePayload.skills || [],
          jobText,
        });
      }

      if ((score.ats_score || 0) < minAts) continue;

      shortlisted.push({
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          course: student.course,
          cgpa: student.cgpa,
          backlogs: student.backlogs,
          resumeUrl: student.resumeUrl,
        },
        ats_score: score.ats_score,
        match_level: score.match_level,
        matched_skills: score.matched_skills,
        missing_skills: score.missing_skills,
        cosine_similarity: score.cosine_similarity,
        eligible: score.eligible !== false && eligible,
        reasons: [...reasons, ...(score.eligibility_reasons || [])],
      });
    }

    shortlisted.sort((a, b) => b.ats_score - a.ats_score);
    const trimmed = shortlisted.slice(0, limit);

    const csvHeader =
      "name,email,course,cgpa,backlogs,ats_score,match_level,matched_skills,missing_skills,eligible\n";
    const csvRows = trimmed
      .map((row) =>
        [
          JSON.stringify(row.student.name || ""),
          JSON.stringify(row.student.email || ""),
          JSON.stringify(row.student.course || ""),
          row.student.cgpa ?? "",
          row.student.backlogs ?? "",
          row.ats_score,
          row.match_level,
          JSON.stringify((row.matched_skills || []).join("|")),
          JSON.stringify((row.missing_skills || []).join("|")),
          row.eligible,
        ].join(",")
      )
      .join("\n");

    res.json({
      success: true,
      data: {
        drive,
        shortlisted: trimmed,
        export: {
          csv_ready: true,
          csv: csvHeader + csvRows,
          count: trimmed.length,
        },
      },
    });
  } catch (error) {
    console.error("Shortlist error:", error);
    res.status(500).json({ message: error.message || "Shortlist failed" });
  }
};
