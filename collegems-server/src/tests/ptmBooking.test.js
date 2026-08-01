import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import User from "../models/User.model.js";
import PTMBooking from "../models/PTMBooking.model.js";
import { processPTMReminders } from "../cron/ptmReminder.cron.js";

test("Parent-Teacher Meeting Hub", async (t) => {
  let mongoServer;
  let parentToken;
  let teacherToken;
  let parentUser;
  let teacherUser;
  let studentUser;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    studentUser = await User.create({
      name: "Child Student",
      email: "child.ptm@test.com",
      password: "password123",
      role: "student",
      studentId: "S-PTM-1",
      semester: "5",
      course: "CS",
    });

    parentUser = await User.create({
      name: "PTM Parent",
      email: "parent.ptm@test.com",
      password: "password123",
      role: "parent",
      childId: studentUser._id,
    });
    parentToken = jwt.sign(
      { id: parentUser._id, role: parentUser.role },
      jwtSecret
    );

    teacherUser = await User.create({
      name: "PTM Teacher",
      email: "teacher.ptm@test.com",
      password: "password123",
      role: "teacher",
      department: "Computer Science",
    });
    teacherToken = jwt.sign(
      { id: teacherUser._id, role: teacherUser.role },
      jwtSecret
    );
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("parent can request a PTM with a teacher", async () => {
    const when = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const res = await request(app)
      .post("/api/ptm")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({
        teacherId: teacherUser._id.toString(),
        scheduledAt: when.toISOString(),
        reason: "Discuss mid-term grades and attendance",
        durationMinutes: 30,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.status, "pending");
    assert.ok(res.body.data.meetingRoomId.startsWith("SCMS-PTM-"));
    assert.ok(String(res.body.data.meetingUrl).includes("meet.jit.si"));
  });

  await t.test("teacher can approve PTM and room becomes available", async () => {
    const booking = await PTMBooking.findOne({ parent: parentUser._id });
    assert.ok(booking);

    const approve = await request(app)
      .patch(`/api/ptm/${booking._id}/status`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ status: "approved" });

    assert.strictEqual(approve.status, 200);
    assert.strictEqual(approve.body.data.status, "approved");

    const room = await request(app)
      .get(`/api/ptm/${booking._id}/room`)
      .set("Authorization", `Bearer ${parentToken}`);

    assert.strictEqual(room.status, 200);
    assert.ok(room.body.data.meetingUrl);
  });

  await t.test("teacher can save notes and action items", async () => {
    const booking = await PTMBooking.findOne({ parent: parentUser._id });
    const res = await request(app)
      .patch(`/api/ptm/${booking._id}/notes`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        teacherNotes: "Student should revise unit 2.",
        actionItems: [{ text: "Share practice worksheet", done: false }],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.teacherNotes, "Student should revise unit 2.");
    assert.strictEqual(res.body.data.actionItems.length, 1);
  });

  await t.test("reminder processor marks upcoming approved meetings", async () => {
    const booking = await PTMBooking.findOne({ parent: parentUser._id });
    booking.scheduledAt = new Date(Date.now() + 15 * 60 * 1000);
    booking.set("reminderSentAt", undefined);
    await booking.save();
    await PTMBooking.updateOne(
      { _id: booking._id },
      { $unset: { reminderSentAt: 1 } }
    );

    const summary = await processPTMReminders(new Date());
    assert.ok(summary.processed >= 1);

    const updated = await PTMBooking.findById(booking._id);
    assert.ok(updated.reminderSentAt);
  });
});
