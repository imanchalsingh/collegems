import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Complaint from "../models/Complaint.model.js";
import jwt from "jsonwebtoken";

const XSS_PAYLOAD = "<img src=x onerror=alert(document.cookie)>";

test("Complaint XSS Sanitization Tests (issue #594)", async (t) => {
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
      name: "Complaint Student",
      email: "complaintstudent@test.com",
      password: "password123",
      role: "student",
      studentId: "S-7001",
      semester: "3",
      course: "Computer Science",
    });
    studentToken = jwt.sign(
      { id: studentUser._id, _id: studentUser._id, role: studentUser.role },
      jwtSecret,
    );

    const hodUser = await User.create({
      name: "Complaint HOD",
      email: "complainthod@test.com",
      password: "password123",
      role: "hod",
      departmentCode: "CS",
    });
    hodToken = jwt.sign({ id: hodUser._id, _id: hodUser._id, role: hodUser.role }, jwtSecret);
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("POST /api/complaints strips script payloads from title/description", async () => {
    const res = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        title: XSS_PAYLOAD,
        description: XSS_PAYLOAD,
        category: "Technical",
      });

    assert.strictEqual(res.status, 201);
    assert.ok(!res.body.title.includes("onerror="));
    assert.ok(!res.body.description.includes("onerror="));

    const stored = await Complaint.findById(res.body._id);
    assert.ok(!stored.title.includes("onerror="));
    assert.ok(!stored.description.includes("onerror="));
  });

  await t.test("POST /api/complaints/:id/comments strips script payloads from comment message", async () => {
    const created = await Complaint.create({
      student: studentUser._id,
      title: "Wifi issue",
      description: "Wifi is down in hostel block A",
      category: "Technical",
    });

    const res = await request(app)
      .post(`/api/complaints/${created._id}/comments`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ message: XSS_PAYLOAD });

    assert.strictEqual(res.status, 200);
    const lastComment = res.body.comments[res.body.comments.length - 1];
    assert.ok(!lastComment.message.includes("onerror="));

    const stored = await Complaint.findById(created._id);
    const storedComment = stored.comments[stored.comments.length - 1];
    assert.ok(!storedComment.message.includes("onerror="));
  });

  await t.test("PATCH /api/complaints/:id strips script payloads from resolutionNotes", async () => {
    const created = await Complaint.create({
      student: studentUser._id,
      title: "Broken chair",
      description: "Chair in lab 2 is broken",
      category: "Technical",
    });

    const res = await request(app)
      .patch(`/api/complaints/${created._id}`)
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ status: "Resolved", resolutionNotes: XSS_PAYLOAD });

    assert.strictEqual(res.status, 200);
    assert.ok(!res.body.resolutionNotes.includes("onerror="));

    const stored = await Complaint.findById(created._id);
    assert.ok(!stored.resolutionNotes.includes("onerror="));
  });
});
