import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";

import User from "../models/User.model.js";
import DataLockWindow from "../models/DataLockWindow.model.js";

process.env.JWT_SECRET = "test-secret";

let mongoServer;
let teacherToken;
let hodToken;
let teacherUser;
let hodUser;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Create HOD User
  hodUser = await User.create({
    name: "Admin HOD",
    email: "hod@admin.com",
    password: "password123",
    role: "hod",
    department: "Computer Science"
  });
  hodToken = jwt.sign({ id: hodUser._id, role: hodUser.role }, process.env.JWT_SECRET || "test-secret");

  // 2. Create Teacher User
  teacherUser = await User.create({
    name: "Regular Teacher",
    email: "teacher@test.com",
    password: "password123",
    role: "teacher",
    teacherId: "T-001",
    department: "Computer Science"
  });
  teacherToken = jwt.sign({ id: teacherUser._id, role: teacherUser.role }, process.env.JWT_SECRET || "test-secret");
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.afterEach(async () => {
  await DataLockWindow.deleteMany({});
});

test("Data Lock Enforcement Tests", async (t) => {
  await t.test("Should block modifications for non-HOD users when a lock is active", async () => {
    const now = new Date();
    await DataLockWindow.create({
      name: "Result Finalization Week",
      startTime: new Date(now.getTime() - 100000), // past
      endTime: new Date(now.getTime() + 100000),   // future
      affectedModules: ["results"],
      isActive: true,
      createdBy: hodUser._id
    });

    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        student: new mongoose.Types.ObjectId(),
        course: new mongoose.Types.ObjectId(),
        marks: 85
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.isLocked, true);
    assert.match(res.body.message, /Modifications are currently disabled/);
  });

  await t.test("Should allow modifications for non-HOD users when NO lock is active", async () => {
    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({});
    
    assert.notStrictEqual(res.status, 403);
    assert.notStrictEqual(res.body.isLocked, true);
  });

  await t.test("Should allow modifications for HOD users even when a lock is active", async () => {
    const now = new Date();
    await DataLockWindow.create({
      name: "Result Finalization Week",
      startTime: new Date(now.getTime() - 100000),
      endTime: new Date(now.getTime() + 100000),
      affectedModules: ["results"],
      isActive: true,
      createdBy: hodUser._id
    });

    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({});

    assert.notStrictEqual(res.status, 403);
    assert.notStrictEqual(res.body.isLocked, true);
  });

  await t.test("Should block modifications if lock applies to 'all'", async () => {
    const now = new Date();
    await DataLockWindow.create({
      name: "System Maintenance",
      startTime: new Date(now.getTime() - 100000),
      endTime: new Date(now.getTime() + 100000),
      affectedModules: ["all"],
      isActive: true,
      createdBy: hodUser._id
    });

    const res = await request(app)
      .post("/api/attendance/mark")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ date: new Date(), records: [] });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.isLocked, true);
  });

  await t.test("Should allow modifications if lock applies to a DIFFERENT module", async () => {
    const now = new Date();
    await DataLockWindow.create({
      name: "Result Finalization Week",
      startTime: new Date(now.getTime() - 100000),
      endTime: new Date(now.getTime() + 100000),
      affectedModules: ["results"],
      isActive: true,
      createdBy: hodUser._id
    });

    const res = await request(app)
      .post("/api/attendance/mark")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ date: new Date(), records: [] });

    assert.notStrictEqual(res.status, 403);
    assert.notStrictEqual(res.body.isLocked, true);
  });
});

test("Data Lock CRUD Operations Tests", async (t) => {
  await t.test("Should create a new data lock as HOD", async () => {
    const res = await request(app)
      .post("/api/data-locks")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({
        name: "Midterm Audit",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
        affectedModules: ["attendance", "assignments"]
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, "Midterm Audit");
  });

  await t.test("Should list active data locks", async () => {
    const now = new Date();
    await DataLockWindow.create({
      name: "Active Lock",
      startTime: new Date(now.getTime() - 100000),
      endTime: new Date(now.getTime() + 100000),
      affectedModules: ["results"],
      isActive: true,
      createdBy: hodUser._id
    });

    const res = await request(app)
      .get("/api/data-locks?status=active")
      .set("Authorization", `Bearer ${hodToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.length, 1);
  });

  await t.test("Should update an existing data lock", async () => {
    const lock = await DataLockWindow.create({
      name: "Old Lock",
      startTime: new Date(),
      endTime: new Date(Date.now() + 100000),
      affectedModules: ["results"],
      isActive: true,
      createdBy: hodUser._id
    });

    const res = await request(app)
      .put(`/api/data-locks/${lock._id}`)
      .set("Authorization", `Bearer ${hodToken}`)
      .send({
        name: "Updated Lock",
        affectedModules: ["attendance"]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, "Updated Lock");
    assert.deepStrictEqual(res.body.data.affectedModules, ["attendance"]);
  });

  await t.test("Should delete a data lock", async () => {
    const lock = await DataLockWindow.create({
      name: "Lock To Delete",
      startTime: new Date(),
      endTime: new Date(Date.now() + 100000),
      affectedModules: ["results"],
      isActive: true,
      createdBy: hodUser._id
    });

    const res = await request(app)
      .delete(`/api/data-locks/${lock._id}`)
      .set("Authorization", `Bearer ${hodToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});
