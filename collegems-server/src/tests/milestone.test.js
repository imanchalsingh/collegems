import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import StudentTimelineEvent from "../models/StudentTimelineEvent.model.js";
import Attendance from "../models/Attendance.model.js";
import Assignment from "../models/Assignment.model.js";
import Results from "../models/Results.model.js";
import Fee from "../models/Fee.model.js";
import Leave from "../models/Leave.model.js";
import VerifiedCertificate from "../models/VerifiedCertificate.model.js";
import Achievement from "../models/Achievement.model.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import jwt from "jsonwebtoken";

test("Student Academic Milestone API Tests", async (t) => {
  let mongoServer;
  let jwtSecret;
  let studentToken, studentUser;
  let teacherToken, teacherUser;
  let course;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    // Create Student
    studentUser = await User.create({
      name: "Alice Student",
      email: "alice@test.com",
      password: "password123",
      role: "student",
      studentId: "S-101",
      semester: "1",
      course: "Computer Science",
    });
    studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, jwtSecret);

    // Create Teacher
    teacherUser = await User.create({
      name: "Professor Bob",
      email: "bob@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-101",
      department: "Computer Science",
    });
    teacherToken = jwt.sign({ id: teacherUser._id, role: teacherUser.role }, jwtSecret);

    // Create Course
    course = await Course.create({
      name: "Programming in C++",
      code: "CS-101",
      department: "Computer Science",
      semester: 1,
      teacher: teacherUser._id,
    });
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("GET /api/student/milestones should reject unauthorized requests", async () => {
    const res = await request(app)
      .get("/api/student/milestones")
      .send();

    assert.strictEqual(res.status, 401);
  });

  await t.test("GET /api/student/milestones should reject non-student requests", async () => {
    const res = await request(app)
      .get("/api/student/milestones")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send();

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /Forbidden: Only students can access/i);
  });

  await t.test("GET /api/student/milestones should return registration and admission milestones by default", async () => {
    const res = await request(app)
      .get("/api/student/milestones")
      .set("Authorization", `Bearer ${studentToken}`)
      .send();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.milestones));
    
    // By default, registration and admission should be returned
    const registration = res.body.milestones.find(m => m.category === "Registration");
    const admission = res.body.milestones.find(m => m.category === "Admission");

    assert.ok(registration);
    assert.ok(admission);
    assert.strictEqual(registration.status, "Completed");
    assert.strictEqual(admission.status, "Completed");
  });

  await t.test("GET /api/student/milestones filters by category", async () => {
    // Create an assignment milestone
    await Assignment.create({
      title: "C++ Basics Homework",
      description: "Write basic class definitions",
      course: course._id,
      dueDate: new Date(Date.now() + 86400000 * 2), // 2 days in future -> Upcoming
      totalPoints: 100,
    });

    const res = await request(app)
      .get("/api/student/milestones?category=Assignment")
      .set("Authorization", `Bearer ${studentToken}`)
      .send();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.milestones.length, 1);
    assert.strictEqual(res.body.milestones[0].category, "Assignment");
    assert.strictEqual(res.body.milestones[0].status, "Upcoming");
  });

  await t.test("GET /api/student/milestones filters by status", async () => {
    // Create attendance record (Missed class)
    await Attendance.create({
      student: studentUser._id,
      course: course._id,
      date: "2026-08-01",
      status: "absent",
    });

    const res = await request(app)
      .get("/api/student/milestones?status=Missed")
      .set("Authorization", `Bearer ${studentToken}`)
      .send();

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.milestones.length > 0);
    const missedEvent = res.body.milestones.find(m => m.status === "Missed");
    assert.ok(missedEvent);
    assert.strictEqual(missedEvent.category, "Attendance");
  });

  await t.test("GET /api/student/milestones supports pagination", async () => {
    // Create additional leave request to increase records count
    await Leave.create({
      user: studentUser._id,
      role: "student",
      subject: "Sick Leave",
      reason: "Flu",
      startDate: new Date(),
      endDate: new Date(),
      status: "Approved",
    });

    const res = await request(app)
      .get("/api/student/milestones?limit=2&page=1")
      .set("Authorization", `Bearer ${studentToken}`)
      .send();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.milestones.length, 2);
    assert.strictEqual(res.body.pagination.page, 1);
    assert.ok(res.body.pagination.totalRecords > 2);
  });
});
