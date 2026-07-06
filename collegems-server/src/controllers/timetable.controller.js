import Timetable from "../models/Timetable.model.js";
import TimetableEntry from "../models/TimetableEntry.model.js";
import TimetableRule from "../models/TimetableRule.model.js";
import Room from "../models/Room.model.js";
import TimeSlot from "../models/TimeSlot.model.js";
import { jobQueue } from "../engine/JobQueue.js";
import { checkSemesterFrozen } from "../services/semesterService.js";

// @desc    Trigger timetable generation
// @route   POST /api/timetable/generate
// @access  Private/Admin
export const generateTimetable = async (req, res) => {
  try {
    const { name, department, semester } = req.body;

    await checkSemesterFrozen(semester);

    const timetable = new Timetable({
      name,
      department,
      semester,
      status: "pending",
      createdBy: req.user?._id || null, // Assuming you have authentication middleware
    });

    await timetable.save();

    // Send to background job queue
    jobQueue.addJob(timetable._id);

    res.status(202).json({
      success: true,
      message: "Timetable generation started",
      data: timetable,
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all timetables
// @route   GET /api/timetable
// @access  Private
export const getTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: timetables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get timetable status by ID
// @route   GET /api/timetable/:id
// @access  Private
export const getTimetableStatus = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ success: false, message: "Timetable not found" });
    }
    res.status(200).json({ success: true, data: timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get generated timetable entries
// @route   GET /api/timetable/:id/entries
// @access  Private
export const getTimetableEntries = async (req, res) => {
  try {
    const entries = await TimetableEntry.find({ timetable: req.params.id })
      .populate("course")
      .populate("faculty", "name email")
      .populate("room")
      .populate("timeSlot")
      .sort({ "timeSlot.dayOfWeek": 1, "timeSlot.startTime": 1 });

    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import { checkConflicts } from "../services/scheduleValidation.service.js";
import mongoose from "mongoose";

// @desc    Get reusable timetable slot suggestions based on frequent patterns
// @route   GET /api/timetable/suggestions
// @access  Private
export const getSuggestions = async (req, res) => {
  try {
    const { department, semester, timetableId } = req.query;

    const pipeline = [];

    // Optional filtering by department or semester via lookup
    if (department || semester) {
      pipeline.push({
        $lookup: {
          from: "timetables",
          localField: "timetable",
          foreignField: "_id",
          as: "timetableDoc"
        }
      });
      pipeline.push({ $unwind: "$timetableDoc" });
      
      const matchCriteria = {};
      if (department) matchCriteria["timetableDoc.department"] = department;
      if (semester) matchCriteria["timetableDoc.semester"] = parseInt(semester);
      
      pipeline.push({ $match: matchCriteria });
    }

    pipeline.push({
      $group: {
        _id: {
          course: "$course",
          faculty: "$faculty",
          room: "$room",
          timeSlot: "$timeSlot"
        },
        count: { $sum: 1 }
      }
    });

    pipeline.push({ $match: { count: { $gt: 1 } } }); // Only frequent patterns
    pipeline.push({ $sort: { count: -1 } });
    pipeline.push({ $limit: 20 });

    // Lookup to populate course, faculty, room, timeSlot for readability
    pipeline.push(
      {
        $lookup: {
          from: "courses",
          localField: "_id.course",
          foreignField: "_id",
          as: "courseInfo"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.faculty",
          foreignField: "_id",
          as: "facultyInfo"
        }
      },
      {
        $lookup: {
          from: "rooms",
          localField: "_id.room",
          foreignField: "_id",
          as: "roomInfo"
        }
      },
      {
        $lookup: {
          from: "timeslots",
          localField: "_id.timeSlot",
          foreignField: "_id",
          as: "timeSlotInfo"
        }
      }
    );

    const suggestionsRaw = await TimetableEntry.aggregate(pipeline);

    // Format the response and filter conflicts if timetableId is provided
    const suggestions = [];
    for (const s of suggestionsRaw) {
      const suggestionItem = {
        course: s.courseInfo[0],
        faculty: s.facultyInfo[0],
        room: s.roomInfo[0],
        timeSlot: s.timeSlotInfo[0],
        frequency: s.count
      };
      
      if (timetableId && suggestionItem.course && suggestionItem.faculty && suggestionItem.room && suggestionItem.timeSlot) {
        const validation = await checkConflicts({
          timetableId,
          timeSlotId: suggestionItem.timeSlot._id,
          facultyId: suggestionItem.faculty._id,
          roomId: suggestionItem.room._id,
          courseId: suggestionItem.course._id
        });
        if (!validation.hasConflicts) {
          suggestions.push(suggestionItem);
        }
      } else {
        suggestions.push(suggestionItem);
      }
    }

    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a specific entry (manual override)
// @route   PUT /api/timetable/entries/:entryId
// @access  Private/Admin
export const updateTimetableEntry = async (req, res) => {
  try {
    const { room, timeSlot, faculty, course } = req.body;
    const entryId = req.params.entryId;
    
    // Validate hard constraints before updating.
    // We need to fetch the existing entry to get the timetable ID and course ID if not provided in body
    const existingEntry = await TimetableEntry.findById(entryId);
    if (!existingEntry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    const targetCourse = course || existingEntry.course;

    const validation = await checkConflicts({
      timetableId: existingEntry.timetable,
      timeSlotId: timeSlot,
      facultyId: faculty,
      roomId: room,
      courseId: targetCourse,
      excludeEntryId: entryId
    });

    if (validation.hasConflicts) {
      return res.status(409).json({
        success: false,
        errorType: "SCHEDULE_CONFLICT",
        message: "Schedule conflicts detected.",
        conflicts: validation.conflicts
      });
    }

    const entry = await TimetableEntry.findByIdAndUpdate(
      entryId,
      { room, timeSlot, faculty, course: targetCourse },
      { new: true }
    );

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Configuration Endpoints ---

export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimeSlots = async (req, res) => {
  try {
    const slots = await TimeSlot.find();
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRules = async (req, res) => {
  try {
    const rules = await TimetableRule.find();
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
