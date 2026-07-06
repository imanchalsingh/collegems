import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

// Load routes & models
import userRoutes from "../routes/user.routes.js";
import User from "../models/User.model.js";

process.env.JWT_SECRET = "testsecret_student_dir";

const app = express();
app.set("query parser", "extended");
app.use(express.json());
// Expose user routes at /api/users
app.use("/api/users", userRoutes);

let mongoServer;
let teacherToken;

test("Student Directory Department Filtering", async (t) => {
  await t.test("Setup", async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  await t.test("Seed Custom Edge-Case Data", async () => {
    // 1. Create teacher to perform queries
    const teacherUser = await User.create({
      name: "Test Teacher",
      email: "teacher@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T1",
      department: "Computer Science",
    });

    teacherToken = jwt.sign(
      { id: teacherUser._id, role: teacherUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 2. Create students across different departments
    await User.create([
      {
        name: "Alice CS",
        email: "alice@test.com",
        password: "password123",
        role: "student",
        studentId: "S1",
        semester: "1",
        course: "BCA",
        department: "Computer Science",
      },
      {
        name: "Bob CS",
        email: "bob@test.com",
        password: "password123",
        role: "student",
        studentId: "S2",
        semester: "2",
        course: "BCA",
        department: "Computer Science",
      },
      {
        name: "Charlie Math",
        email: "charlie@test.com",
        password: "password123",
        role: "student",
        studentId: "S3",
        semester: "1",
        course: "BSc",
        department: "Mathematics",
      },
      {
        name: "Dave Business",
        email: "dave@test.com",
        password: "password123",
        role: "student",
        studentId: "S4",
        semester: "3",
        course: "BBA",
        department: "Business",
      },
      // 3. Edge Case: Student with no department assigned (legacy user)
      {
        name: "Eve NoDept",
        email: "eve@test.com",
        password: "password123",
        role: "student",
        studentId: "S5",
        semester: "4",
        course: "BCA",
      }
    ]);
  });

  await t.test("Fetch all students (no filter)", async () => {
    const res = await request(app)
      .get("/api/users/students")
      .set("Authorization", `Bearer ${teacherToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 5); // 5 students
  });

  await t.test("Filter by Department: Computer Science", async () => {
    const res = await request(app)
      .get("/api/users/students")
      .query({ filter: { department: "Computer Science" } })
      .set("Authorization", `Bearer ${teacherToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 2);
    assert.ok(res.body.data.every(s => s.department === "Computer Science"));
  });

  await t.test("Filter by Department: Mathematics", async () => {
    const res = await request(app)
      .get("/api/users/students")
      .query({ filter: { department: "Mathematics" } })
      .set("Authorization", `Bearer ${teacherToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].name, "Charlie Math");
  });

  await t.test("Filter by Department with No Matches", async () => {
    const res = await request(app)
      .get("/api/users/students")
      .query({ filter: { department: "Arts" } })
      .set("Authorization", `Bearer ${teacherToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 0); // No arts students
  });

  await t.test("Filter by Department: Unassigned", async () => {
    const res = await request(app)
      .get("/api/users/students")
      .query({ filter: { department: "unassigned" } })
      .set("Authorization", `Bearer ${teacherToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].name, "Eve NoDept");
  });

  await t.test("Teardown", async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
});
