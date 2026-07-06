import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Attendance from "../models/Attendance.model.js";
import AttendanceAlert from "../models/AttendanceAlert.model.js";
import { analyzeAttendanceAnomalies } from "../services/attendanceAnomaly.service.js";

let mongoServer;

describe("Attendance Anomaly Detection Tests", () => {
  let student1, student2, student3, course;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    student1 = await User.create({
      name: "Alice Active", email: "alice@example.com", password: "pass", role: "student", course: "BCA", semester: "1"
    });
    student2 = await User.create({
      name: "Bob Truant", email: "bob@example.com", password: "pass", role: "student", course: "BCA", semester: "1"
    });
    student3 = await User.create({
      name: "Charlie Ghost", email: "charlie@example.com", password: "pass", role: "student", course: "BCA", semester: "1"
    });

    course = await Course.create({
      name: "Math 101", code: "M101", credits: 3, description: "Basic Math", teacher: new mongoose.Types.ObjectId(),
      semester: "1", department: "Computer Science"
    });
  });

  beforeEach(async () => {
    await Attendance.deleteMany({});
    await AttendanceAlert.deleteMany({});
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should detect CONSECUTIVE_ABSENCE when a student is absent 3 times in a row", async () => {
    // Bob is absent 3 times
    await Attendance.insertMany([
      { student: student2._id, course: course._id, date: "2026-06-18", status: "absent" },
      { student: student2._id, course: course._id, date: "2026-06-19", status: "absent" },
      { student: student2._id, course: course._id, date: "2026-06-20", status: "absent" },
      // Alice is present
      { student: student1._id, course: course._id, date: "2026-06-18", status: "present" },
      { student: student1._id, course: course._id, date: "2026-06-19", status: "present" },
      { student: student1._id, course: course._id, date: "2026-06-20", status: "present" }
    ]);

    await analyzeAttendanceAnomalies();

    const alerts = await AttendanceAlert.find({ alertType: "CONSECUTIVE_ABSENCE" });
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].student.toString(), student2._id.toString());
    assert.strictEqual(alerts[0].severity, "high");
  });

  it("should NOT detect CONSECUTIVE_ABSENCE if interrupted by present", async () => {
    // Bob is absent 2 times, then present
    await Attendance.insertMany([
      { student: student2._id, course: course._id, date: "2026-06-18", status: "absent" },
      { student: student2._id, course: course._id, date: "2026-06-19", status: "absent" },
      { student: student2._id, course: course._id, date: "2026-06-20", status: "present" }
    ]);

    await analyzeAttendanceAnomalies();

    const alerts = await AttendanceAlert.find({ alertType: "CONSECUTIVE_ABSENCE" });
    assert.strictEqual(alerts.length, 0);
  });

  it("should detect MISSING_RECORDS for a student with no attendance in the last N days", async () => {
    // Alice has recent attendance
    await Attendance.insertMany([
      { student: student1._id, course: course._id, date: new Date().toISOString().split("T")[0], status: "present" },
      // Bob's last attendance was 10 days ago
      { student: student2._id, course: course._id, date: "2026-06-01", status: "present" }
    ]);

    await analyzeAttendanceAnomalies();

    const alerts = await AttendanceAlert.find({ alertType: "MISSING_RECORDS" }).sort({ student: 1 });
    
    // Both Bob and Charlie should be flagged (Charlie has NO records ever)
    const bobAlert = alerts.find(a => a.student.toString() === student2._id.toString());
    const charlieAlert = alerts.find(a => a.student.toString() === student3._id.toString());

    assert.ok(bobAlert, "Bob should have a missing records alert");
    assert.ok(charlieAlert, "Charlie should have a missing records alert");
  });
});
