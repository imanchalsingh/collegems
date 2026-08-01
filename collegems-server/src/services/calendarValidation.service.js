import AcademicCalendar from "../models/AcademicCalendar.model.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import Event from "../models/Events.model.js";

const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const trimmed = timeStr.trim();
  const match = trimmed.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();
  
  if (hours === 12 && modifier === "AM") hours = 0;
  if (hours !== 12 && modifier === "PM") hours += 12;
  
  return hours * 60 + minutes;
};

const timesOverlap = (startA, endA, startB, endB) => {
  if (startA === null || endA === null || startB === null || endB === null) return true;
  return Math.max(startA, startB) < Math.min(endA, endB);
};

const validateInput = ({ date, startTime, endTime }) => {
  const errors = [];

  // Validate date
  if (!date) {
    errors.push('Date is required');
  } else {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Invalid date format. Use ISO format (YYYY-MM-DD)');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) {
        errors.push('Date cannot be in the past');
      }
    }
  }

  // Validate startTime
  if (!startTime) {
    errors.push('Start time is required');
  } else if (typeof startTime !== 'string' || startTime.trim() === '') {
    errors.push('Start time must be a non-empty string');
  } else {
    const minutes = timeToMinutes(startTime);
    if (minutes === null) {
      errors.push('Invalid start time format. Use "HH:MM AM/PM" format');
    }
  }

  // Validate endTime
  if (!endTime) {
    errors.push('End time is required');
  } else if (typeof endTime !== 'string' || endTime.trim() === '') {
    errors.push('End time must be a non-empty string');
  } else {
    const minutes = timeToMinutes(endTime);
    if (minutes === null) {
      errors.push('Invalid end time format. Use "HH:MM AM/PM" format');
    }
  }

  // Validate startTime < endTime
  if (startTime && endTime) {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (startMin !== null && endMin !== null && startMin >= endMin) {
      errors.push('Start time must be before end time');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const checkScheduleConflicts = async ({ date, startTime, endTime, excludeId = null }) => {
  try {
    // Validate input
    const validation = validateInput({ date, startTime, endTime });
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const targetStartMin = timeToMinutes(startTime);
    const targetEndMin = timeToMinutes(endTime);

    const startOfDay = targetDate;
    const endOfDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    // 1. Check Holidays & Academic Events
    const academicEvents = await AcademicCalendar.find({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
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

    // 2. Check Exams - Optimized query
    const exams = await ExamSchedule.find({
      examDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).lean();

    for (const exam of exams) {
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
        $gte: startOfDay,
        $lt: endOfDay
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

  } catch (error) {
    console.error('Calendar validation error:', {
      message: error.message,
      stack: error.stack,
      input: { date, startTime, endTime, excludeId }
    });
    throw error;
  }
};