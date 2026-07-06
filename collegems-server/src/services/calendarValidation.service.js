import AcademicCalendar from "../models/AcademicCalendar.model.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import Event from "../models/Events.model.js";

/**
 * Normalizes a time string like "10:00 AM" into minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();
  
  if (hours === 12 && modifier === "AM") hours = 0;
  if (hours !== 12 && modifier === "PM") hours += 12;
  
  return hours * 60 + minutes;
};

/**
 * Checks if two time intervals overlap. 
 * If either time is null (all-day event), we consider it an overlap with ANY event on that day.
 */
const timesOverlap = (startA, endA, startB, endB) => {
  // If any event is all-day (missing start/end time), it overlaps the whole day
  if (startA === null || endA === null || startB === null || endB === null) return true;
  return Math.max(startA, startB) < Math.min(endA, endB);
};

export const checkScheduleConflicts = async ({ date, startTime, endTime, excludeId = null }) => {
  // Target date normalized to start of day
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const targetStartMin = timeToMinutes(startTime);
  const targetEndMin = timeToMinutes(endTime);

  // 1. Check Holidays & Academic Events
  const academicEvents = await AcademicCalendar.find({
    date: {
      $gte: targetDate,
      $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
    }
  }).lean();

  for (const event of academicEvents) {
    if (excludeId && event._id.toString() === excludeId.toString()) continue;
    
    const evStartMin = timeToMinutes(event.startTime);
    const evEndMin = timeToMinutes(event.endTime);
    
    if (timesOverlap(targetStartMin, targetEndMin, evStartMin, evEndMin)) {
      return {
        hasConflict: true,
        conflictMessage: `Conflict with ${event.category || 'Academic Event'}: "${event.title}"`,
        conflictDetails: event
      };
    }
  }

  // 2. Check Exams
  // We need to match examDate to targetDate
  const exams = await ExamSchedule.find().lean();
  const examsOnDate = exams.filter(e => {
    if (!e.examDate) return false;
    const d = new Date(e.examDate);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime() === targetDate.getTime();
  });

  for (const exam of examsOnDate) {
    if (excludeId && exam._id.toString() === excludeId.toString()) continue;
    
    const exStartMin = timeToMinutes(exam.startTime);
    const exEndMin = timeToMinutes(exam.endTime);
    
    if (timesOverlap(targetStartMin, targetEndMin, exStartMin, exEndMin)) {
      return {
        hasConflict: true,
        conflictMessage: `Conflict with Exam: "${exam.examName}" for ${exam.course}`,
        conflictDetails: exam
      };
    }
  }

  // 3. Check Institutional Events/Workshops
  const events = await Event.find({
    date: {
      $gte: targetDate,
      $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
    }
  }).lean();

  for (const ev of events) {
    if (excludeId && ev._id.toString() === excludeId.toString()) continue;
    
    const evStartMin = timeToMinutes(ev.startTime);
    const evEndMin = timeToMinutes(ev.endTime);
    
    if (timesOverlap(targetStartMin, targetEndMin, evStartMin, evEndMin)) {
      return {
        hasConflict: true,
        conflictMessage: `Conflict with Event: "${ev.title}"`,
        conflictDetails: ev
      };
    }
  }

  return { hasConflict: false };
};
