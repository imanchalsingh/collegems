import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

// Load routes & models
import examScheduleRoutes from "../routes/examschedule.routes.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import User from "../models/User.model.js";

process.env.JWT_SECRET = "testsecret";

const app = express();
app.use(express.json());
app.use("/api/examschedule", examScheduleRoutes);

let mongoServer;

test("Upcoming Exams Endpoint", async (t) => {
  await t.test("Setup", async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  let studentUser;
  let token;

  await t.test("Seed Data", async () => {
    studentUser = await User.create({
      name: "Test Student",
      email: "student@test.com",
      password: "password123",
      role: "student",
      studentId: "S102",
      semester: "2",
      course: "BCA",
    });

    token = jwt.sign({ id: studentUser._id, role: studentUser.role, course: studentUser.course }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Past Exam
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 5);
    await ExamSchedule.create({
      examName: "Past Math Exam",
      course: "BCA",
      examDate: formatDate(pastDate),
      startTime: "10:00 AM",
      endTime: "12:00 PM",
      location: "Room 101",
      venue: 1
    });

    // Upcoming Exam (within 14 days)
    const upcomingDate1 = new Date(today);
    upcomingDate1.setDate(today.getDate() + 5);
    await ExamSchedule.create({
      examName: "Upcoming Science Exam",
      course: "BCA",
      examDate: formatDate(upcomingDate1),
      startTime: "10:00 AM",
      endTime: "12:00 PM",
      location: "Room 102",
      venue: 2
    });

    // Upcoming Exam (in 30 days) - outside default 14 days
    const upcomingDate2 = new Date(today);
    upcomingDate2.setDate(today.getDate() + 30);
    await ExamSchedule.create({
      examName: "Far Future English Exam",
      course: "BCA",
      examDate: formatDate(upcomingDate2),
      startTime: "10:00 AM",
      endTime: "12:00 PM",
      location: "Room 103",
      venue: 3
    });

    // Exam for another course
    await ExamSchedule.create({
      examName: "Other Course Exam",
      course: "MCA",
      examDate: formatDate(upcomingDate1),
      startTime: "10:00 AM",
      endTime: "12:00 PM",
      location: "Room 104",
      venue: 4
    });
  });

  await t.test("GET /api/examschedule/upcoming - Default 14 days", async () => {
    const res = await request(app)
      .get("/api/examschedule/upcoming")
      .set("Authorization", `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].examName, "Upcoming Science Exam");
  });

  await t.test("GET /api/examschedule/upcoming - Custom days query param", async () => {
    const res = await request(app)
      .get("/api/examschedule/upcoming?days=40")
      .set("Authorization", `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.length, 2);
    // Checked sorting chronological
    assert.strictEqual(res.body.data[0].examName, "Upcoming Science Exam");
    assert.strictEqual(res.body.data[1].examName, "Far Future English Exam");
  });

  await t.test("Teardown", async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
});
