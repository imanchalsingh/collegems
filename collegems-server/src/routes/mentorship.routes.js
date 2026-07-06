import express from "express";
import {
  assignMentor,
  getMyMentees,
  getMyMentors,
  getAllMentorships,
  addMeetingLog,
  getMeetingLogs,
  addConcern,
  getConcerns,
  updateConcern,
  addPerformanceDiscussion,
  getPerformanceDiscussions,
  getProgressHistory
} from "../controllers/mentorship.controller.js";
import { authenticate, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Assign mentor (admin or hod)
router.post("/", authenticate, restrictTo("hod", "admin"), assignMentor);

// Get all mentorships (admin or hod)
router.get("/", authenticate, restrictTo("hod", "admin"), getAllMentorships);

// Mentors view their mentees
router.get("/my-mentees", authenticate, restrictTo("teacher", "hod"), getMyMentees);

// Students view their mentors
router.get("/my-mentors", authenticate, restrictTo("student"), getMyMentors);

// --- Meeting Logs ---
router.post("/:mentorshipId/meetings", authenticate, restrictTo("teacher", "hod"), addMeetingLog);
router.get("/:mentorshipId/meetings", authenticate, getMeetingLogs);

// --- Student Concerns ---
router.post("/:mentorshipId/concerns", authenticate, restrictTo("teacher", "hod"), addConcern);
router.get("/:mentorshipId/concerns", authenticate, getConcerns);
router.put("/concerns/:concernId", authenticate, restrictTo("teacher", "hod"), updateConcern);

// --- Performance Discussions ---
router.post("/:mentorshipId/performance", authenticate, restrictTo("teacher", "hod"), addPerformanceDiscussion);
router.get("/:mentorshipId/performance", authenticate, getPerformanceDiscussions);

// --- Progress History ---
router.get("/:mentorshipId/history", authenticate, getProgressHistory);

export default router;
