import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Assignment from "../models/Assignment.model.js";
import jwt from "jsonwebtoken";

test("Assignment Evaluation Security and Validation API Tests", async (t) => {
  let mongoServer;
  let jwtSecret;
  let teacher1Token, teacher1User;
  let teacher2Token, teacher2User;
  let student1Token, student1User;
  let student2Token, student2User;
  let assignment;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    // Create Teacher 1 (Owner)
    teacher1User = await User.create({
      name: "Teacher One",
      email: "teacher1@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-1001",
      department: "Computer Science",
    });
    teacher1Token = jwt.sign({ id: teacher1User._id, role: teacher1User.role }, jwtSecret);

    // Create Teacher 2 (Non-owner)
    teacher2User = await User.create({
      name: "Teacher Two",
      email: "teacher2@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-1002",
      department: "Computer Science",
    });
    teacher2Token = jwt.sign({ id: teacher2User._id, role: teacher2User.role }, jwtSecret);

    // Create Student 1 (Submitted)
    student1User = await User.create({
      name: "Student One",
      email: "student1@test.com",
      password: "password123",
      role: "student",
      studentId: "S-2001",
      semester: "3",
      course: "Computer Science",
    });
    student1Token = jwt.sign({ id: student1User._id, role: student1User.role }, jwtSecret);

    // Create Student 2 (No Submission)
    student2User = await User.create({
      name: "Student Two",
      email: "student2@test.com",
      password: "password123",
      role: "student",
      studentId: "S-2002",
      semester: "3",
      course: "Computer Science",
    });
    student2Token = jwt.sign({ id: student2User._id, role: student2User.role }, jwtSecret);

    // Create Assignment owned by Teacher 1
    assignment = await Assignment.create({
      title: "Networking 101",
      description: "Basic Networking concepts",
      teacher: teacher1User._id,
      dueDate: new Date(Date.now() + 1000000),
      totalPoints: 100,
      submissions: [
        {
          student: student1User._id,
          submittedAt: new Date(),
          status: "submitted",
          textResponse: "Answer text",
        },
      ],
    });
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("POST /api/assignment/evaluate/:id should allow owner teacher to evaluate submission with valid marks", async () => {
    const res = await request(app)
      .post(`/api/assignment/evaluate/${assignment._id}`)
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        studentId: student1User._id.toString(),
        marks: 85,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, "Assignment evaluated");

    // Verify change in DB
    const updatedAssignment = await Assignment.findById(assignment._id);
    const sub = updatedAssignment.submissions.find(s => s.student.toString() === student1User._id.toString());
    assert.strictEqual(sub.marks, 85);
    assert.strictEqual(sub.status, "graded");
  });

  await t.test("POST /api/assignment/evaluate/:id should reject evaluation from non-owner teacher (BOLA)", async () => {
    const res = await request(app)
      .post(`/api/assignment/evaluate/${assignment._id}`)
      .set("Authorization", `Bearer ${teacher2Token}`)
      .send({
        studentId: student1User._id.toString(),
        marks: 90,
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /not authorized/i);
  });

  await t.test("POST /api/assignment/evaluate/:id should reject evaluation if studentId is missing", async () => {
    const res = await request(app)
      .post(`/api/assignment/evaluate/${assignment._id}`)
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        marks: 90,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /studentId is required/i);
  });

  await t.test("POST /api/assignment/evaluate/:id should reject evaluation if student has no submission", async () => {
    const res = await request(app)
      .post(`/api/assignment/evaluate/${assignment._id}`)
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        studentId: student2User._id.toString(),
        marks: 90,
      });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Submission not found/i);
  });

  await t.test("POST /api/assignment/evaluate/:id should reject evaluation if marks exceed total points", async () => {
    const res = await request(app)
      .post(`/api/assignment/evaluate/${assignment._id}`)
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        studentId: student1User._id.toString(),
        marks: 105,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Marks must be between 0 and/i);
  });

  await t.test("POST /api/assignment/evaluate/:id should reject evaluation if marks are negative", async () => {
    const res = await request(app)
      .post(`/api/assignment/evaluate/${assignment._id}`)
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        studentId: student1User._id.toString(),
        marks: -5,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Marks must be between 0 and/i);
  });

  await t.test("POST /api/assignment/evaluate/:id should reject evaluation if marks are non-numeric", async () => {
    const res = await request(app)
      .post(`/api/assignment/evaluate/${assignment._id}`)
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        studentId: student1User._id.toString(),
        marks: "abc",
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Marks must be between 0 and/i);
  });
});
