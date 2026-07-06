import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.model.js";
import User from "../models/User.model.js";
import Room from "../models/Room.model.js";
import TimeSlot from "../models/TimeSlot.model.js";
import TimetableRule from "../models/TimetableRule.model.js";
import connectDB from "../config/db.js";

dotenv.config();

const seedTimetableData = async () => {
  try {
    await connectDB();
    console.log("Database Connected.");

    // Clear existing
    await Room.deleteMany();
    await TimeSlot.deleteMany();
    await TimetableRule.deleteMany();
    console.log("Cleared old timetable data.");

    // 1. Create Rooms
    const rooms = await Room.insertMany([
      { name: "CS-101", capacity: 60, type: "lecture", department: "Computer Science" },
      { name: "CS-102", capacity: 60, type: "lecture", department: "Computer Science" },
      { name: "LAB-1", capacity: 30, type: "lab", department: "Computer Science" },
      { name: "EE-201", capacity: 50, type: "lecture", department: "Electrical" },
    ]);
    console.log(`Inserted ${rooms.length} rooms.`);

    // 2. Create TimeSlots (Mon-Fri, 9am to 3pm)
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const slots = [
      { start: "09:00", end: "10:00" },
      { start: "10:00", end: "11:00" },
      { start: "11:00", end: "12:00" },
      { start: "12:00", end: "13:00", isBreak: true }, // Lunch break
      { start: "13:00", end: "14:00" },
      { start: "14:00", end: "15:00" },
    ];

    const timeSlotsToInsert = [];
    for (const day of days) {
      for (const slot of slots) {
        timeSlotsToInsert.push({
          dayOfWeek: day,
          startTime: slot.start,
          endTime: slot.end,
          isBreak: slot.isBreak || false,
        });
      }
    }
    const timeSlots = await TimeSlot.insertMany(timeSlotsToInsert);
    console.log(`Inserted ${timeSlots.length} timeslots.`);

    // 3. Create Rules
    await TimetableRule.insertMany([
      { name: "No Faculty Overlap", description: "Faculty cannot teach two classes at once", isHardConstraint: true, ruleType: "no_overlap" },
      { name: "Room Capacity", description: "Room must fit students", isHardConstraint: true, ruleType: "room_capacity" },
      { name: "Max Consecutive Hours", description: "Avoid teaching > 3 hours straight", isHardConstraint: false, ruleType: "max_consecutive", parameters: { maxHours: 3 } },
    ]);
    console.log("Inserted timetable rules.");

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error with timetable seeder", error);
    process.exit(1);
  }
};

seedTimetableData();
