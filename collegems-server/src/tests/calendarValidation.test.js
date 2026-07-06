import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { checkScheduleConflicts } from "../services/calendarValidation.service.js";
import AcademicCalendar from "../models/AcademicCalendar.model.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import Event from "../models/Events.model.js";

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.beforeEach(async () => {
  await AcademicCalendar.deleteMany({});
  await ExamSchedule.deleteMany({});
  await Event.deleteMany({});
});

test("checkScheduleConflicts - No Conflicts", async () => {
  const result = await checkScheduleConflicts({
    date: "2024-10-10",
    startTime: "09:00 AM",
    endTime: "10:00 AM"
  });

  assert.strictEqual(result.hasConflict, false);
});

test("checkScheduleConflicts - Holiday Overlap", async () => {
  // Create an all-day holiday
  await AcademicCalendar.create({
    title: "Diwali",
    description: "Festival of Lights",
    category: "Holiday",
    date: "2024-10-31",
    startTime: "",
    endTime: ""
  });

  // Attempt to schedule an exam on the holiday
  const result = await checkScheduleConflicts({
    date: "2024-10-31",
    startTime: "10:00 AM",
    endTime: "12:00 PM"
  });

  assert.strictEqual(result.hasConflict, true);
  assert.match(result.conflictMessage, /Conflict with Holiday/);
});

test("checkScheduleConflicts - Exam Overlap with Event", async () => {
  // Create an exam
  await ExamSchedule.create({
    examName: "Midterm Physics",
    course: "Physics 101",
    examDate: "2024-11-05",
    startTime: "01:00 PM",
    endTime: "03:00 PM",
    location: "Main Hall",
    venue: 1,
    type: "Midterm",
    totalMarks: 100
  });

  // Attempt to schedule an event at the same time
  const result = await checkScheduleConflicts({
    date: "2024-11-05",
    startTime: "02:00 PM",
    endTime: "04:00 PM"
  });

  assert.strictEqual(result.hasConflict, true);
  assert.match(result.conflictMessage, /Conflict with Exam/);
});

test("checkScheduleConflicts - Exclude Self on Update", async () => {
  const event = await Event.create({
    title: "Guest Lecture",
    description: "AI in Tech",
    shortDescription: "AI Tech",
    category: "Workshop",
    mode: "online",
    organization: "Tech Club",
    speaker: "Dr. AI",
    coverImage: "url",
    contactName: "John",
    contactEmail: "john@example.com",
    meetingLink: "url",
    date: "2024-11-10",
    startTime: "10:00 AM",
    endTime: "11:00 AM"
  });

  // Updating the same event should not conflict with itself
  const result = await checkScheduleConflicts({
    date: "2024-11-10",
    startTime: "10:30 AM",
    endTime: "11:30 AM",
    excludeId: event._id
  });

  assert.strictEqual(result.hasConflict, false);
});
