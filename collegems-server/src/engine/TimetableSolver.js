import Course from "../models/Course.model.js";
import Room from "../models/Room.model.js";
import TimeSlot from "../models/TimeSlot.model.js";
import TimetableEntry from "../models/TimetableEntry.model.js";
import TimetableRule from "../models/TimetableRule.model.js";
import User from "../models/User.model.js";

export class TimetableSolver {
  constructor(timetableId) {
    this.timetableId = timetableId;
    this.courses = [];
    this.rooms = [];
    this.timeSlots = [];
    this.rules = [];
    
    // Store populated teachers for easy access to unavailableTimeSlots
    this.teachersMap = new Map();
    
    this.bestAssignments = [];
    this.maxScore = -1;
  }

  async loadData() {
    this.courses = await Course.find({}).populate('teacher');
    this.rooms = await Room.find({ isAvailable: true });
    this.timeSlots = await TimeSlot.find({ isBreak: false });
    this.rules = await TimetableRule.find({ isActive: true });

    const teachers = await User.find({ role: "teacher" });
    for (const t of teachers) {
      this.teachersMap.set(t._id.toString(), t);
    }
  }

  async solve() {
    try {
      await this.loadData();

      // Flatten courses into instances to schedule
      let instancesToSchedule = [];
      for (const course of this.courses) {
        if (!course.teacher) continue;
        const classesNeeded = course.credits || 3;
        for (let i = 0; i < classesNeeded; i++) {
          instancesToSchedule.push({
            course: course,
            faculty: course.teacher,
          });
        }
      }

      // We will perform a randomized greedy search + scoring (simulated annealing simplified)
      // Since backtracking `O(n!)` crashes on large datasets, we iterate multiple times, 
      // generating random valid schedules, scoring them, and keeping the best.
      
      let bestFound = false;
      const MAX_ITERATIONS = 50; // Try 50 different random schedule constructions
      
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const assignments = this.generateValidSchedule(instancesToSchedule);
        if (assignments) {
          bestFound = true;
          const score = this.scoreSchedule(assignments);
          if (score > this.maxScore) {
            this.maxScore = score;
            this.bestAssignments = assignments;
          }
        }
      }

      if (bestFound) {
        await TimetableEntry.deleteMany({ timetable: this.timetableId });

        const entriesToInsert = this.bestAssignments.map(a => ({
          timetable: this.timetableId,
          course: a.course._id,
          faculty: a.faculty._id,
          room: a.room._id,
          timeSlot: a.timeSlot._id,
        }));
        
        if (entriesToInsert.length > 0) {
          await TimetableEntry.insertMany(entriesToInsert);
        }
        return { success: true };
      } else {
        return { 
          success: false, 
          conflicts: { reason: "Unable to find a mathematically valid schedule. Constraints are too tight." } 
        };
      }
    } catch (error) {
      console.error("[TimetableSolver] Error:", error);
      return { success: false, conflicts: { error: error.message } };
    }
  }

  // Generates a schedule that satisfies ALL HARD CONSTRAINTS
  generateValidSchedule(instances) {
    let currentAssignments = [];
    
    // Clone instances to shuffle them differently each time
    let pendingInstances = [...instances].sort(() => Math.random() - 0.5);

    for (const instance of pendingInstances) {
      // Find all valid (room, timeslot) pairs for this instance
      let validPairs = [];
      
      for (const room of this.rooms) {
        // Hard Constraint: Room capacity
        if (instance.course.maxStudents > room.capacity) continue;
        
        // Hard Constraint: Lab requirement
        if (instance.course.isLab && room.type !== "lab") continue;
        if (!instance.course.isLab && room.type === "lab") continue;

        for (const timeSlot of this.timeSlots) {
          if (this.isValidHardConstraint(instance, room, timeSlot, currentAssignments)) {
            validPairs.push({ room, timeSlot });
          }
        }
      }

      // If no valid pair exists for this instance, this schedule branch fails
      if (validPairs.length === 0) {
        return null; 
      }

      // Pick a random valid pair
      const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
      currentAssignments.push({
        course: instance.course,
        faculty: instance.faculty,
        room: pair.room,
        timeSlot: pair.timeSlot
      });
    }

    return currentAssignments;
  }

  isValidHardConstraint(instance, room, timeSlot, currentAssignments) {
    // Hard Constraint: Faculty Unavailable Timeslots
    const teacherDoc = this.teachersMap.get(instance.faculty._id.toString());
    if (teacherDoc && teacherDoc.unavailableTimeSlots) {
      if (teacherDoc.unavailableTimeSlots.some(id => id.toString() === timeSlot._id.toString())) {
        return false;
      }
    }

    for (const a of currentAssignments) {
      if (a.timeSlot._id.toString() === timeSlot._id.toString()) {
        // Hard Constraint: Room double booking
        if (a.room._id.toString() === room._id.toString()) return false;
        
        // Hard Constraint: Faculty double booking
        if (a.faculty._id.toString() === instance.faculty._id.toString()) return false;
        
        // Hard Constraint: Batch collision (don't schedule two classes for the same targetBatch at same time)
        if (a.course.targetBatch && instance.course.targetBatch && a.course.targetBatch === instance.course.targetBatch) return false;
      }
    }
    return true;
  }

  // Scores the schedule based on SOFT CONSTRAINTS from TimetableRule
  scoreSchedule(assignments) {
    let score = 1000; // Base score

    // Group by faculty to check soft constraints like 'faculty_break'
    const facultySchedules = {};
    for (const a of assignments) {
      const fId = a.faculty._id.toString();
      if (!facultySchedules[fId]) facultySchedules[fId] = [];
      facultySchedules[fId].push(a);
    }

    for (const rule of this.rules) {
      if (rule.ruleType === "faculty_break") {
        // e.g. penalize if a faculty teaches > maxHours consecutively
        const maxHours = rule.parameters?.maxHours || 3;
        const penalty = rule.penaltyWeight || 10;
        
        for (const [fId, classes] of Object.entries(facultySchedules)) {
          // This is a simplified check. A robust check would sort by timeslot start time.
          // For now, we penalize if they teach too many classes in total without a break.
          if (classes.length > maxHours) {
            score -= penalty;
          }
        }
      }
    }

    return score;
  }
}
