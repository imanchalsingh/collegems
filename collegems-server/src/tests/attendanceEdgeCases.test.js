// src/tests/attendanceEdgeCases.test.js

import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js"; // Express app
import User from "../models/User.model.js";
import Attendance from "../models/Attendance.model.js";
import Course from "../models/Course.model.js";
import jwt from "jsonwebtoken";

function createToken(user) {
  const secret = process.env.JWT_SECRET || "testsecret";
  return jwt.sign({ id: user._id, role: user.role }, secret);
}

test("Attendance API Edge Cases", async (t) => {
  let mongoServer;
  let student, parent, teacher;
  let studentToken, parentToken;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    // Ensure JWT verification uses same secret as token generation in tests
    process.env.JWT_SECRET = "testsecret";

    teacher = await User.create({
      name: "Edge Teacher",
      email: "edge.teacher@test.com",
      password: "pw",
      role: "teacher",
      department: "TestDept",
    });

    const course = await Course.create({
      name: "Test Course",
      code: "TC101",
      department: "TestDept",
      semester: 1,
      teacher: teacher._id,
    });

    student = await User.create({
      name: "Edge Student",
      email: "edge.student@test.com",
      password: "pw",
      role: "student",
      studentId: "S-EDGE",
      semester: "1",
      course: String(course._id),
    });

    parent = await User.create({
      name: "Edge Parent",
      email: "edge.parent@test.com",
      password: "pw",
      role: "parent",
      studentId: "S-EDGE",
      childId: student._id,
    });

    await Attendance.create([
      { student: student._id, course: course._id, date: "2026-10-01", status: "present" },
      { student: student._id, course: course._id, date: "2026-10-02", status: "absent" },
    ]);

    studentToken = createToken(student);
    parentToken = createToken(parent);
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("Student can fetch own attendance with projection", async () => {
    const res = await request(app)
      .get("/api/attendance/my")
      .set("Authorization", `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 2);
    const keys = Object.keys(res.body[0]);
    assert.ok(keys.includes("student"));
    assert.ok(keys.includes("status"));
    assert.ok(keys.includes("date"));
    assert.ok(!keys.includes("__v"));
  });

  await t.test("Parent can fetch linked student's attendance", async () => {
    const res = await request(app)
      .get("/api/attendance/my")
      .set("Authorization", `Bearer ${parentToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 2);
    for (const rec of res.body) {
      assert.strictEqual(String(rec.student), String(student._id));
    }
  });

  await t.test("Missing JWT results in 401", async () => {
    const res = await request(app).get("/api/attendance/my");
    assert.strictEqual(res.status, 401);
  });

  await t.test("Low attendance returns correct percentage and filtering", async () => {
    const res = await request(app)
      .get("/api/attendance/low")
      .set("Authorization", `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    const low = res.body.data.find((d) => String(d._id.student) === String(student._id));
    assert.ok(low, "Student should appear in low attendance list");
    assert.strictEqual(low.percentage, 50);
  });
});
