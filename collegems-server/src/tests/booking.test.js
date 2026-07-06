import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js"; // Express app
import User from "../models/User.model.js";
import Resource from "../models/Resource.model.js";
import Booking from "../models/Booking.model.js";
import jwt from "jsonwebtoken";

test("Booking System API Tests", async (t) => {
  let mongoServer;
  let hodToken;
  let studentToken;
  let studentUser;
  let hodUser;
  let resourceId;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create HOD
    hodUser = await User.create({
      name: "HOD User",
      email: "hod@test.com",
      password: "password123",
      role: "hod",
      department: "Computer Science",
    });

    // Create Student
    studentUser = await User.create({
      name: "Student User",
      email: "student@test.com",
      password: "password123",
      role: "student",
      department: "Computer Science",
      course: "B.Tech",
      semester: 1,
    });

    const jwtSecret = process.env.JWT_SECRET || "testsecret";

    hodToken = jwt.sign({ id: hodUser._id, role: hodUser.role }, jwtSecret);
    studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, jwtSecret);

    // Provide a secret to app just in case it needs it
    process.env.JWT_SECRET = jwtSecret;
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("HOD should create a resource", async () => {
    const res = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({
        name: "Seminar Hall 1",
        type: "seminar_hall",
        capacity: 100,
        status: "active",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, "Seminar Hall 1");
    resourceId = res.body._id;
  });

  await t.test("Student should be able to see available resources", async () => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1); // 1 hour from now
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 3); // 3 hours from now

    const res = await request(app)
      .get(`/api/bookings/available?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`)
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.some(r => r._id === resourceId));
  });

  await t.test("Student should be able to create a booking", async () => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 3);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        resource: resourceId,
        purpose: "Project Presentation",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.purpose, "Project Presentation");
    assert.strictEqual(res.body.status, "pending");
  });

  await t.test("Student should not be able to create conflicting booking", async () => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 2); // Overlaps with previous booking
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 4);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        resource: resourceId,
        purpose: "Another Event",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

    assert.strictEqual(res.status, 409);
    assert.ok(res.body.message.includes("booked or pending"));
  });

  await t.test("HOD should be able to approve a booking", async () => {
    const pendingBooking = await Booking.findOne({ status: "pending" });
    
    const res = await request(app)
      .put(`/api/bookings/${pendingBooking._id}/status`)
      .set("Authorization", `Bearer ${hodToken}`)
      .send({
        status: "approved",
        remarks: "Approved for presentation",
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "approved");
  });

  await t.test("Student should be able to cancel their pending/approved booking", async () => {
    const approvedBooking = await Booking.findOne({ status: "approved" });

    const res = await request(app)
      .put(`/api/bookings/${approvedBooking._id}/cancel`)
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "cancelled");
  });
});
