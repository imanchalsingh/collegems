import mongoose from "mongoose";
import Timetable from "../models/Timetable.model.js";
import TimetableEntry from "../models/TimetableEntry.model.js";
import Room from "../models/Room.model.js";
import TimeSlot from "../models/TimeSlot.model.js";
import Course from "../models/Course.model.js";
import User from "../models/User.model.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

async function callGaSolver(body) {
  const response = await fetch(`${ML_SERVICE_URL}/generate/timetable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    const err = new Error(detail || "ML timetable service error");
    err.status = response.status;
    throw err;
  }
  return response.json();
}

function mapDbToSolverPayload({ courses, rooms, slots, teachers }) {
  const teacherUnavailable = {};
  for (const t of teachers || []) {
    const id = String(t._id);
    const unavailable = (t.unavailableTimeSlots || []).map((s) => String(s));
    if (unavailable.length) teacherUnavailable[id] = unavailable;
  }

  return {
    courses: courses.map((c) => ({
      id: String(c._id),
      name: c.name || c.code || String(c._id),
      teacher_id: String(c.teacher?._id || c.teacher),
      teacher_name: c.teacher?.name || "",
      sessions_per_week: c.credits || 3,
      students: c.enrolledStudents || c.capacity || 40,
      section_id: c.section || c.batch || null,
    })),
    rooms: rooms.map((r) => ({
      id: String(r._id),
      name: r.name || r.code || String(r._id),
      capacity: r.capacity || 40,
    })),
    slots: slots
      .filter((s) => !s.isBreak)
      .map((s) => ({
        id: String(s._id),
        day: s.dayOfWeek || s.day,
        dayOfWeek: s.dayOfWeek || s.day,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    teacher_unavailable: teacherUnavailable,
  };
}

/**
 * Run GA via ML service using DB rooms/slots/courses (or demo payload).
 */
export const generateWithGeneticAlgorithm = async (req, res) => {
  try {
    const {
      name = "GA Timetable",
      department,
      semester,
      demo = false,
      population_size = 40,
      generations = 60,
      seed,
      save = true,
    } = req.body || {};

    let solverInput;
    if (demo) {
      solverInput = {
        demo: true,
        population_size,
        generations,
        seed,
      };
    } else {
      const courseFilter = {};
      if (department) courseFilter.department = department;

      const [courses, rooms, slots, teachers] = await Promise.all([
        Course.find(courseFilter).populate("teacher", "name unavailableTimeSlots"),
        Room.find({ isAvailable: { $ne: false } }),
        TimeSlot.find({}),
        User.find({ role: "teacher" }).select("name unavailableTimeSlots"),
      ]);

      if (!courses.length || !rooms.length || !slots.length) {
        return res.status(400).json({
          message:
            "Need courses, rooms, and timeslots in the database — or set demo:true",
          counts: {
            courses: courses.length,
            rooms: rooms.length,
            slots: slots.length,
          },
        });
      }

      solverInput = {
        ...mapDbToSolverPayload({ courses, rooms, slots, teachers }),
        population_size,
        generations,
        seed,
      };
    }

    const started = Date.now();
    const result = await callGaSolver(solverInput);
    const generationTimeMs = result.generationTimeMs || Date.now() - started;

    let timetable = null;
    let savedEntries = [];

    if (save && !demo) {
      timetable = await Timetable.create({
        name,
        department,
        semester,
        status: result.feasible ? "completed" : "completed",
        conflictReport: result.conflicts,
        generationTimeMs,
        solver: "genetic",
        fitnessScore: result.fitness,
        createdBy: req.user?.id || null,
      });

      // Persist only when IDs look like Mongo ObjectIds from our DB
      const validAssignments = (result.assignments || []).filter(
        (a) =>
          mongoose.Types.ObjectId.isValid(a.courseId) &&
          mongoose.Types.ObjectId.isValid(a.teacherId) &&
          mongoose.Types.ObjectId.isValid(a.roomId) &&
          mongoose.Types.ObjectId.isValid(a.slotId),
      );

      if (validAssignments.length) {
        await TimetableEntry.deleteMany({ timetable: timetable._id });
        savedEntries = await TimetableEntry.insertMany(
          validAssignments.map((a) => ({
            timetable: timetable._id,
            course: a.courseId,
            faculty: a.teacherId,
            room: a.roomId,
            timeSlot: a.slotId,
          })),
        );
      }
    } else if (save && demo) {
      timetable = await Timetable.create({
        name: name || "GA Demo Timetable",
        department: department || "Demo",
        semester,
        status: "completed",
        conflictReport: result.conflicts,
        generationTimeMs,
        solver: "genetic",
        fitnessScore: result.fitness,
        createdBy: req.user?.id || null,
      });
    }

    res.status(201).json({
      success: true,
      message: result.feasible
        ? "Conflict-free timetable generated"
        : "Timetable generated with residual hard conflicts — review recommended",
      timetable,
      result,
      savedEntryCount: savedEntries.length,
    });
  } catch (err) {
    console.error("GA timetable generate error:", err);
    const status = err.status && Number(err.status) < 600 ? Number(err.status) : 502;
    res.status(status).json({
      success: false,
      message:
        status === 502
          ? "ML timetable service unavailable. Start collegems-ml-service on :8000."
          : err.message || "Failed to generate timetable",
    });
  }
};

/**
 * Export GA result / stored timetable as iCal.
 */
export const exportTimetableIcal = async (req, res) => {
  try {
    const { assignments } = req.body || {};
    if (!Array.isArray(assignments) || !assignments.length) {
      return res.status(400).json({ message: "assignments array required" });
    }

    const dayToOffset = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
    };

    // Anchor to next Monday
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 1 : 1 - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + diffToMonday);

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CollegeMS//GA Timetable//EN",
      "CALSCALE:GREGORIAN",
    ];

    for (const a of assignments) {
      const offset = dayToOffset[a.day] ?? 0;
      const [sh = "09", sm = "00"] = String(a.startTime || "09:00").split(":");
      const [eh = "10", em = "00"] = String(a.endTime || "10:00").split(":");
      const start = new Date(monday);
      start.setDate(monday.getDate() + offset);
      start.setHours(Number(sh), Number(sm), 0, 0);
      const end = new Date(monday);
      end.setDate(monday.getDate() + offset);
      end.setHours(Number(eh), Number(em), 0, 0);

      const fmt = (d) =>
        d
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}Z$/, "Z");

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${a.sessionId || `${a.courseId}-${a.slotId}`}@collegems`);
      lines.push(`DTSTAMP:${fmt(new Date())}`);
      lines.push(`DTSTART:${fmt(start)}`);
      lines.push(`DTEND:${fmt(end)}`);
      lines.push(
        `SUMMARY:${(a.courseName || "Class").replace(/,/g, "\\,")} (${(a.roomName || "").replace(/,/g, "\\,")})`,
      );
      lines.push(
        `DESCRIPTION:Teacher: ${(a.teacherName || "").replace(/,/g, "\\,")}`,
      );
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    const ics = lines.join("\r\n");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="timetable.ics"');
    res.send(ics);
  } catch (err) {
    console.error("iCal export error:", err);
    res.status(500).json({ message: "Failed to export iCal" });
  }
};
