import Mentorship from "../models/Mentorship.model.js";
import MeetingLog from "../models/MeetingLog.model.js";
import StudentConcern from "../models/StudentConcern.model.js";
import PerformanceDiscussion from "../models/PerformanceDiscussion.model.js";
import User from "../models/User.model.js";

// --- Mentorship Assignment ---

export const assignMentor = async (req, res) => {
  try {
    const { mentorId, menteeId } = req.body;
    
    // Check if both exist
    const mentor = await User.findById(mentorId);
    const mentee = await User.findById(menteeId);
    if (!mentor || !mentee) {
      return res.status(404).json({ message: "Mentor or Mentee not found." });
    }

    // Check if already active
    const existing = await Mentorship.findOne({ mentor: mentorId, mentee: menteeId, status: "active" });
    if (existing) {
      return res.status(400).json({ message: "This active mentorship already exists." });
    }

    const mentorship = new Mentorship({
      mentor: mentorId,
      mentee: menteeId,
      status: "active"
    });
    await mentorship.save();

    res.status(201).json({ message: "Mentor assigned successfully", mentorship });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign mentor", error: error.message });
  }
};

export const getMyMentees = async (req, res) => {
  try {
    const mentorships = await Mentorship.find({ mentor: req.user.userId || req.user.id, status: "active" })
      .populate("mentee", "name email studentId course semester");
    res.json(mentorships);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch mentees", error: error.message });
  }
};

export const getMyMentors = async (req, res) => {
  try {
    const mentorships = await Mentorship.find({ mentee: req.user.userId || req.user.id, status: "active" })
      .populate("mentor", "name email teacherId department");
    res.json(mentorships);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch mentors", error: error.message });
  }
};

export const getAllMentorships = async (req, res) => {
  try {
    const mentorships = await Mentorship.find()
      .populate("mentor", "name email department")
      .populate("mentee", "name email course semester");
    res.json(mentorships);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch mentorships", error: error.message });
  }
};

// --- Meeting Logs ---

export const addMeetingLog = async (req, res) => {
  try {
    const { mentorshipId } = req.params;
    const meetingLog = new MeetingLog({
      mentorship: mentorshipId,
      ...req.body
    });
    await meetingLog.save();
    res.status(201).json({ message: "Meeting log added", meetingLog });
  } catch (error) {
    res.status(500).json({ message: "Failed to add meeting log", error: error.message });
  }
};

export const getMeetingLogs = async (req, res) => {
  try {
    const { mentorshipId } = req.params;
    const logs = await MeetingLog.find({ mentorship: mentorshipId }).sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch meeting logs", error: error.message });
  }
};

// --- Student Concerns ---

export const addConcern = async (req, res) => {
  try {
    const { mentorshipId } = req.params;
    const concern = new StudentConcern({
      mentorship: mentorshipId,
      ...req.body
    });
    await concern.save();
    res.status(201).json({ message: "Concern added", concern });
  } catch (error) {
    res.status(500).json({ message: "Failed to add concern", error: error.message });
  }
};

export const getConcerns = async (req, res) => {
  try {
    const { mentorshipId } = req.params;
    const concerns = await StudentConcern.find({ mentorship: mentorshipId }).sort({ dateReported: -1 });
    res.json(concerns);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch concerns", error: error.message });
  }
};

export const updateConcern = async (req, res) => {
  try {
    const { concernId } = req.params;
    const concern = await StudentConcern.findByIdAndUpdate(concernId, req.body, { new: true });
    res.json({ message: "Concern updated", concern });
  } catch (error) {
    res.status(500).json({ message: "Failed to update concern", error: error.message });
  }
};

// --- Performance Discussions ---

export const addPerformanceDiscussion = async (req, res) => {
  try {
    const { mentorshipId } = req.params;
    const discussion = new PerformanceDiscussion({
      mentorship: mentorshipId,
      ...req.body
    });
    await discussion.save();
    res.status(201).json({ message: "Performance discussion added", discussion });
  } catch (error) {
    res.status(500).json({ message: "Failed to add performance discussion", error: error.message });
  }
};

export const getPerformanceDiscussions = async (req, res) => {
  try {
    const { mentorshipId } = req.params;
    const discussions = await PerformanceDiscussion.find({ mentorship: mentorshipId }).sort({ date: -1 });
    res.json(discussions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch performance discussions", error: error.message });
  }
};

// --- Progress History ---

export const getProgressHistory = async (req, res) => {
  try {
    const { mentorshipId } = req.params;
    
    const [meetings, concerns, performance] = await Promise.all([
      MeetingLog.find({ mentorship: mentorshipId }),
      StudentConcern.find({ mentorship: mentorshipId }),
      PerformanceDiscussion.find({ mentorship: mentorshipId })
    ]);

    const history = [
      ...meetings.map(m => ({ ...m.toObject(), historyType: "meeting", historyDate: m.date })),
      ...concerns.map(c => ({ ...c.toObject(), historyType: "concern", historyDate: c.dateReported })),
      ...performance.map(p => ({ ...p.toObject(), historyType: "performance", historyDate: p.date }))
    ].sort((a, b) => new Date(b.historyDate) - new Date(a.historyDate));

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch progress history", error: error.message });
  }
};
