import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  createJobPosting,
  getJobPostings,
  applyForJob,
  getJobApplications
} from "../controllers/jobBoard.controller.js";

const router = express.Router();

router.use(authenticate);

// Publicly viewable by students/alumni/faculty
router.get("/", getJobPostings);

// Alumni and Faculty can post jobs
router.post("/", authorize("alumni", "teacher", "hod"), createJobPosting);

// Students can apply
router.post("/:jobId/apply", authorize("student"), applyForJob);

// Job poster can view applications
router.get("/:jobId/applications", authorize("alumni", "teacher", "hod"), getJobApplications);

export default router;
