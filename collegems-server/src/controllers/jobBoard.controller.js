import JobPosting from "../models/JobPosting.model.js";
import JobApplication from "../models/JobApplication.model.js";
import Alumni from "../models/Alumni.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";

// Create a job posting (Alumni/Faculty)
export const createJobPosting = async (req, res, next) => {
  try {
    if (req.user.role === "alumni") {
      const alumni = await Alumni.findOne({ userId: req.user.id });
      if (!alumni || !alumni.isVerified) {
        return res.status(403).json({ success: false, message: "Only verified alumni can post jobs" });
      }
    }

    const job = new JobPosting({
      ...req.body,
      postedBy: req.user.id
    });

    await job.save();
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

// Get all active job postings
export const getJobPostings = async (req, res, next) => {
  try {
    const { type, company, search } = req.query;
    
    let query = { status: "open" };
    if (type) query.type = type;
    if (company) query.company = { $regex: company, $options: "i" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const jobs = await JobPosting.find(query)
      .populate("postedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

// Apply to a job (Student)
export const applyForJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    const job = await JobPosting.findById(jobId);
    if (!job || job.status !== "open") {
      return res.status(404).json({ success: false, message: "Job not found or closed" });
    }

    const existingApplication = await JobApplication.findOne({ job: jobId, student: req.user.id });
    if (existingApplication) {
      return res.status(400).json({ success: false, message: "You have already applied for this job" });
    }

    const student = await User.findById(req.user.id);
    if (!student.resumeUrl) {
      return res.status(400).json({ success: false, message: "Please upload a resume to your profile first" });
    }

    const application = new JobApplication({
      job: jobId,
      student: req.user.id,
      resumeUrl: student.resumeUrl,
      coverLetter
    });

    await application.save();

    // Notify the job poster
    await Notification.create({
      recipient: job.postedBy,
      type: "job",
      message: `${student.name} has applied for your posting: ${job.title}`
    });

    res.status(201).json({ success: true, message: "Application submitted successfully", data: application });
  } catch (error) {
    next(error);
  }
};

// View applications for a specific job (Job Poster only)
export const getJobApplications = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await JobPosting.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    if (job.postedBy.toString() !== req.user.id && req.user.role !== "hod") {
      return res.status(403).json({ success: false, message: "Unauthorized to view these applications" });
    }

    const applications = await JobApplication.find({ job: jobId })
      .populate("student", "name email phone course semester")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};
