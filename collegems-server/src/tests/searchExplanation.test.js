import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Announcement from "../models/Announcement.model.js";
import Assignment from "../models/Assignment.model.js";
import jwt from "jsonwebtoken";

test("Search Result Explanation Tests", async (t) => {
  let mongoServer;
  let adminToken;
  let adminUser;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    adminUser = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      password: "password123",
      role: "hod", // HOD can search everyone
      teacherId: "ADMIN-001"
    });
    adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, jwtSecret);

    // Seed Data for Search
    // 1. Users
    await User.create({
      name: "John Doe",
      email: "john.unique@email.com",
      password: "password123",
      role: "student",
      studentId: "STU-999",
      course: "Computer Science",
      semester: "1"
    });

    // 2. Courses
    await Course.create({
      name: "Unique Advanced Calculus",
      code: "MATH-501",
      department: "Mathematics",
      credits: 4,
      semester: 1,
      teacher: adminUser._id
    });

    // 3. Announcements
    await Announcement.create({
      title: "Unique Holiday Notice",
      message: "College will be closed on unique dates",
      targetRole: "all",
      postedBy: adminUser._id
    });

    // 4. Assignments
    await Assignment.create({
      title: "Unique Midterm Project",
      description: "Submit your unique project by friday"
    });
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("Should explain match by User Email", async () => {
    const res = await request(app)
      .get("/api/search?q=john.unique")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.users.length, 1);
    assert.strictEqual(res.body.data.users[0].matchReason, "Matched by Email");
  });

  await t.test("Should explain match by User Name", async () => {
    const res = await request(app)
      .get("/api/search?q=Doe")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.users.length, 1);
    assert.strictEqual(res.body.data.users[0].matchReason, "Matched by Name");
  });

  await t.test("Should explain match by Student ID", async () => {
    const res = await request(app)
      .get("/api/search?q=STU-999")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.users.length, 1);
    assert.strictEqual(res.body.data.users[0].matchReason, "Matched by Student ID");
  });

  await t.test("Should explain match by Course Code", async () => {
    const res = await request(app)
      .get("/api/search?q=MATH-501")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.courses.length, 1);
    assert.strictEqual(res.body.data.courses[0].matchReason, "Matched by Code");
  });

  await t.test("Should explain match by Course Name", async () => {
    const res = await request(app)
      .get("/api/search?q=Advanced Calculus")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.courses.length, 1);
    assert.strictEqual(res.body.data.courses[0].matchReason, "Matched by Name");
  });

  await t.test("Should explain match by Announcement Title", async () => {
    const res = await request(app)
      .get("/api/search?q=Holiday")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.announcements.length, 1);
    assert.strictEqual(res.body.data.announcements[0].matchReason, "Matched by Title");
  });

  await t.test("Should explain match by Assignment Description", async () => {
    const res = await request(app)
      .get("/api/search?q=Submit your unique")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.assignments.length, 1);
    assert.strictEqual(res.body.data.assignments[0].matchReason, "Matched by Description");
  });
});
