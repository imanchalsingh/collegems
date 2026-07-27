import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Scholarship from "../models/Scholarship.model.js";
import jwt from "jsonwebtoken";

test("Scholarship Amount Validation Tests", async (t) => {
  let mongoServer;
  let jwtSecret;
  let studentToken, studentUser;
  let hodToken;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    studentUser = await User.create({
      name: "Scholarship Student",
      email: "scholarshipstudent@test.com",
      password: "password123",
      role: "student",
      studentId: "S-8001",
      semester: "3",
      course: "Computer Science",
    });
    studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, jwtSecret);

    const hodUser = await User.create({
      name: "Scholarship HOD",
      email: "scholarshiphod@test.com",
      password: "password123",
      role: "hod",
      departmentCode: "CS",
    });
    hodToken = jwt.sign({ id: hodUser._id, role: hodUser.role }, jwtSecret);
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("POST /api/scholarships rejects a negative amount (issue #593 repro)", async () => {
    const res = await request(app)
      .post("/api/scholarships")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        scholarshipName: "Merit Scholarship",
        amount: -50000,
        academicYear: "2026-2027",
        category: "Merit",
        reason: "Top of class",
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /positive number/i);

    const stored = await Scholarship.findOne({ studentId: studentUser._id });
    assert.strictEqual(stored, null);
  });

  await t.test("POST /api/scholarships rejects a zero amount", async () => {
    const res = await request(app)
      .post("/api/scholarships")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        scholarshipName: "Merit Scholarship",
        amount: 0,
        academicYear: "2026-2027",
        category: "Merit",
        reason: "Top of class",
      });

    assert.strictEqual(res.status, 400);
  });

  await t.test("POST /api/scholarships accepts a valid positive amount", async () => {
    const res = await request(app)
      .post("/api/scholarships")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        scholarshipName: "Merit Scholarship",
        amount: 50000,
        academicYear: "2026-2027",
        category: "Merit",
        reason: "Top of class",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.amount, 50000);
  });

  await t.test("PATCH /:id/review rejects approval of an application with an invalid stored amount", async () => {
    const bypassed = await Scholarship.collection.insertOne({
      studentId: studentUser._id,
      scholarshipName: "Legacy Bad Record",
      amount: -1000,
      academicYear: "2026-2027",
      category: "Merit",
      reason: "Pre-existing bad data",
      status: "Pending",
    });

    const res = await request(app)
      .patch(`/api/scholarships/${bypassed.insertedId}/review`)
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ status: "Approved" });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /invalid amount/i);

    const stored = await Scholarship.collection.findOne({ _id: bypassed.insertedId });
    assert.strictEqual(stored.status, "Pending");
  });
});
