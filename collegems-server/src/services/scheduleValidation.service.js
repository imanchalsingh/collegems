import TimetableEntry from '../models/TimetableEntry.model.js';
import User from '../models/User.model.js';
import Room from '../models/Room.model.js';
import Course from '../models/Course.model.js';

/**
 * Checks for scheduling conflicts before creating or updating a timetable entry.
 * 
 * @param {Object} params
 * @param {string} params.timetableId
 * @param {string} params.timeSlotId
 * @param {string} params.facultyId
 * @param {string} params.roomId
 * @param {string} params.courseId
 * @param {string} [params.excludeEntryId] - Omit this entry ID from checks (used during updates)
 * @returns {Promise<{ hasConflicts: boolean, conflicts: Array<{type: string, message: string}> }>}
 */
export const checkConflicts = async ({ timetableId, timeSlotId, facultyId, roomId, courseId, excludeEntryId }) => {
  const conflicts = [];

  const query = {
    timetable: timetableId,
    timeSlot: timeSlotId,
    $or: [
      { faculty: facultyId },
      { room: roomId },
      { course: courseId }
    ]
  };

  if (excludeEntryId) {
    query._id = { $ne: excludeEntryId };
  }

  // Find all overlapping entries for this timeslot in this timetable
  const overlappingEntries = await TimetableEntry.find(query)
    .populate('faculty', 'name')
    .populate('room', 'name')
    .populate('course', 'name code');

  if (overlappingEntries.length === 0) {
    return { hasConflicts: false, conflicts };
  }

  // Process overlapping entries to generate human-readable error messages
  overlappingEntries.forEach(entry => {
    if (entry.faculty._id.toString() === facultyId.toString()) {
      conflicts.push({
        type: 'FACULTY',
        message: `${entry.faculty.name} is already scheduled to teach ${entry.course.name} at this time in ${entry.room.name}.`
      });
    }

    if (entry.room._id.toString() === roomId.toString()) {
      conflicts.push({
        type: 'ROOM',
        message: `${entry.room.name} is already booked for ${entry.course.name} by ${entry.faculty.name}.`
      });
    }

    if (entry.course._id.toString() === courseId.toString()) {
      conflicts.push({
        type: 'SECTION',
        message: `The student section for ${entry.course.name} is already attending a class with ${entry.faculty.name} in ${entry.room.name}.`
      });
    }
  });

  // Remove duplicate messages if a single overlapping entry triggers multiple conditions
  const uniqueConflicts = Array.from(new Set(conflicts.map(c => JSON.stringify(c))))
    .map(str => JSON.parse(str));

  return {
    hasConflicts: uniqueConflicts.length > 0,
    conflicts: uniqueConflicts
  };
};
