import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import User from "../models/User.model.js";
import Complaint from "../models/Complaint.model.js";
import { processSlaEscalations } from "../cron/slaEscalationCron.js";
import { getSlaHours } from "../utils/slaEscalation.js";

test("Complaint SLA escalation matrix", async (t) => {
  let mongoServer;
  let studentToken;
  let hodToken;
  let studentUser;
  let hodUser;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    studentUser = await User.create({
      name: "SLA Student",
      email: "slastudent@test.com",
      password: "password123",
      role: "student",
      studentId: "S-8801",
      semester: "4",
      course: "CS",
    });
    studentToken = jwt.sign(
      { id: studentUser._id, role: studentUser.role },
      jwtSecret
    );

    hodUser = await User.create({
      name: "SLA HOD",
      email: "slahod@test.com",
      password: "password123",
      role: "hod",
    });
    hodToken = jwt.sign({ id: hodUser._id, role: hodUser.role }, jwtSecret);
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("creates complaint with SLA deadline and handler role", async () => {
    const res = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        title: "Hostel water shortage",
        description: "No water in block B",
        category: "Hostel",
        priority: "High",
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.slaDeadline);
    assert.strictEqual(res.body.currentHandlerRole, "Hostel Warden");
    assert.strictEqual(res.body.escalationLevel, 0);
    assert.strictEqual(getSlaHours("High"), 12);
  });

  await t.test("supports anonymous reporting with tracking ID", async () => {
    const res = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        title: "Sensitive grievance",
        description: "Ragging incident near hostel gate",
        category: "Ragging",
        priority: "Critical",
        isAnonymous: true,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.isAnonymous, true);
    assert.ok(String(res.body.anonymousTrackingId).startsWith("GRV-"));

    const list = await request(app)
      .get("/api/complaints")
      .set("Authorization", `Bearer ${hodToken}`);

    assert.strictEqual(list.status, 200);
    const anon = list.body.find((c) => c._id === res.body._id);
    assert.ok(anon);
    assert.strictEqual(anon.student.name, "Anonymous Reporter");
  });

  await t.test("auto-escalates when SLA deadline has expired", async () => {
    const complaint = await Complaint.create({
      student: studentUser._id,
      title: "Broken classroom AC",
      description: "AC not working in room 204",
      category: "Infrastructure",
      priority: "Medium",
      status: "Submitted",
      escalationLevel: 0,
      currentHandlerRole: "Infrastructure Officer",
      slaDeadline: new Date(Date.now() - 60_000),
    });

    const summary = await processSlaEscalations();
    assert.ok(summary.processed >= 1);

    const updated = await Complaint.findById(complaint._id);
    assert.strictEqual(updated.escalationLevel, 1);
    assert.strictEqual(updated.currentHandlerRole, "Dean Administration");
    assert.strictEqual(updated.slaBreached, true);
    assert.ok(updated.escalationHistory.length >= 1);
  });

  await t.test("GET /api/complaints/escalation-matrix returns matrix payload", async () => {
    const res = await request(app)
      .get("/api/complaints/escalation-matrix")
      .set("Authorization", `Bearer ${hodToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.matrix.Hostel);
    assert.ok(Array.isArray(res.body.data.complaints));
    assert.ok(res.body.data.slaHours.Medium === 48);
  });
});
