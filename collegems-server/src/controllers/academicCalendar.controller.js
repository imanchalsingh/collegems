import AcademicCalendar from "../models/AcademicCalendar.model.js";
import Assignment from "../models/Assignment.model.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import Event from "../models/Events.model.js";
import { checkScheduleConflicts } from "../services/calendarValidation.service.js";

// CREATE CUSTOM EVENT (HOD only)
export const createAcademicEvent = async (req, res) => {
  try {
    const { title, description, category, date, startTime, endTime, location } = req.body;

    if (!title || !description || !category || !date) {
      return res.status(400).json({
        success: false,
        message: "Title, description, category, and date are required.",
      });
    }

    const validation = await checkScheduleConflicts({
      date,
      startTime: startTime || "",
      endTime: endTime || ""
    });

    if (validation.hasConflict) {
      return res.status(409).json({
        success: false,
        message: validation.conflictMessage,
        conflictDetails: validation.conflictDetails
      });
    }

    const event = new AcademicCalendar({
      title,
      description,
      category,
      date,
      startTime: startTime || "",
      endTime: endTime || "",
      location: location || "",
      createdBy: req.user.id,
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: "Academic event created successfully",
      data: event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL MERGED CALENDAR EVENTS (All roles)
export const getAllCalendarEvents = async (req, res) => {
  try {
    const [customEvents, assignments, exams, workshops] = await Promise.all([
      AcademicCalendar.find().lean(),
      Assignment.find().populate("course").lean(),
      ExamSchedule.find().lean(),
      Event.find().lean(),
    ]);

    // 1. Map custom events
    const mappedCustom = customEvents.map((e) => ({
      ...e,
      isSystemGenerated: false,
    }));

    // 2. Map assignment deadlines
    const mappedAssignments = assignments.map((a) => ({
      _id: a._id,
      title: a.title || "Assignment Due",
      description: `Assignment submission deadline for ${a.course ? a.course.name : "Course"}.`,
      category: "Assignment",
      date: a.dueDate,
      startTime: "11:59 PM",
      endTime: "",
      location: "Online Submission",
      isSystemGenerated: true,
    }));

    // 3. Map exams
    const mappedExams = exams.map((e) => {
      let parsedDate;
      try {
        parsedDate = e.examDate ? new Date(e.examDate) : new Date();
      } catch (err) {
        parsedDate = new Date();
      }
      return {
        _id: e._id,
        title: `${e.examName} (${e.course})`,
        description: `Exam for course: ${e.course}. Venue: ${e.venue || e.location || "Main Hall"}.`,
        category: "Exam",
        date: parsedDate,
        startTime: e.startTime || "",
        endTime: e.endTime || "",
        location: e.location || (e.venue ? `Room ${e.venue}` : "Main Hall"),
        isSystemGenerated: true,
      };
    });

    // 4. Map workshops / campus events
    const mappedWorkshops = workshops.map((w) => ({
      _id: w._id,
      title: w.title,
      description: w.shortDescription || w.description,
      category: "Workshop",
      date: w.date,
      startTime: w.startTime || "",
      endTime: w.endTime || "",
      location: w.mode === "online" ? "Online (Link provided)" : w.venue || "Campus",
      isSystemGenerated: true,
    }));

    // Merge all lists
    const allEvents = [
      ...mappedCustom,
      ...mappedAssignments,
      ...mappedExams,
      ...mappedWorkshops,
    ];

    // Sort by date ascending
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      success: true,
      count: allEvents.length,
      data: allEvents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE CUSTOM EVENT (HOD only)
export const updateAcademicEvent = async (req, res) => {
  try {
    const existing = await AcademicCalendar.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const newDate = req.body.date || existing.date;
    const newStartTime = req.body.startTime !== undefined ? req.body.startTime : existing.startTime;
    const newEndTime = req.body.endTime !== undefined ? req.body.endTime : existing.endTime;

    const validation = await checkScheduleConflicts({
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      excludeId: req.params.id
    });

    if (validation.hasConflict) {
      return res.status(409).json({
        success: false,
        message: validation.conflictMessage,
        conflictDetails: validation.conflictDetails
      });
    }

    const event = await AcademicCalendar.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.json({
      success: true,
      message: "Academic event updated successfully",
      data: event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE CUSTOM EVENT (HOD only)
export const deleteAcademicEvent = async (req, res) => {
  try {
    const event = await AcademicCalendar.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.json({
      success: true,
      message: "Academic event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
