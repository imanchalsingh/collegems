import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";

import User from "../models/User.model.js";
import Results from "../models/Results.model.js";
import RecordSnapshot from "../models/RecordSnapshot.model.js";

process.env.JWT_SECRET = "test-secret";

let mongoServer;
let adminToken;
let teacherToken;
let adminUser;
let teacherUser;
let studentUser;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  adminUser = await User.create({
    name: "Admin User",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
    department: "Admin"
  });
  adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET || "test-secret");

  teacherUser = await User.create({
    name: "Regular Teacher",
    email: "teacher@test.com",
    password: "password123",
    role: "teacher",
    teacherId: "T-001",
    department: "Computer Science"
  });
  teacherToken = jwt.sign({ id: teacherUser._id, role: teacherUser.role }, process.env.JWT_SECRET || "test-secret");

  studentUser = await User.create({
    name: "Student One",
    email: "student1@test.com",
    password: "password123",
    role: "student",
    studentId: "STU-001",
    course: "BCA",
    semester: 1
  });
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.afterEach(async () => {
  await RecordSnapshot.deleteMany({});
  await Results.deleteMany({});
});

test("Record Snapshot Tests", async (t) => {
  await t.test("Should create a snapshot automatically on User.save()", async () => {
    // Modify student
    studentUser.name = "Student One Updated";
    await studentUser.save({ editorId: teacherUser._id });

    const snapshots = await RecordSnapshot.find({ recordId: studentUser._id });
    assert.strictEqual(snapshots.length, 1);
    assert.strictEqual(snapshots[0].operation, "update");
    assert.strictEqual(snapshots[0].data.name, "Student One"); // Old name
    assert.strictEqual(snapshots[0].editor.toString(), teacherUser._id.toString());
  });

  await t.test("Should create a snapshot automatically on Results.findOneAndUpdate()", async () => {
    // 1. Create a result
    const result = await Results.create({
      studentId: studentUser._id,
      courseId: new mongoose.Types.ObjectId(),
      totalMarks: 80,
      grade: "A"
    });

    // 2. Update the result using findByIdAndUpdate
    await Results.findByIdAndUpdate(
      result._id,
      { totalMarks: 90 },
      { editorId: adminUser._id }
    );

    const snapshots = await RecordSnapshot.find({ recordId: result._id });
    console.log("SNAPSHOT DATA:", snapshots[0]?.data);
    // Verify snapshot was created correctly
    assert.strictEqual(snapshots.length, 1, "Snapshot should be created");
    assert.ok(snapshots[0].data, "Snapshot should have data");
    assert.strictEqual(snapshots[0].data.totalMarks, 80); // Old marks
    assert.strictEqual(snapshots[0].editor.toString(), adminUser._id.toString());
  });

  await t.test("API: Should get snapshots for a record (admin)", async () => {
    // Manually create a snapshot for testing API
    const result = await Results.create({
      studentId: studentUser._id,
      courseId: new mongoose.Types.ObjectId(),
      totalMarks: 50,
      grade: "C"
    });

    await RecordSnapshot.create({
      collectionName: "results",
      modelName: "Results",
      recordId: result._id,
      data: { ...result.toObject(), totalMarks: 40 }, // pretend it was 40
      operation: "update",
      editor: teacherUser._id
    });

    const res = await request(app)
      .get(`/api/snapshots/Results/${result._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].data.totalMarks, 40);
  });

  await t.test("API: Should deny access to non-admin/hod", async () => {
    const res = await request(app)
      .get(`/api/snapshots/Results/123456789012345678901234`)
      .set("Authorization", `Bearer ${teacherToken}`);
    
    // Teacher is not admin/hod
    assert.strictEqual(res.status, 403);
  });

  await t.test("API: Should restore a record from a snapshot", async () => {
    const result = await Results.create({
      studentId: studentUser._id,
      courseId: new mongoose.Types.ObjectId(),
      totalMarks: 95,
      grade: "A+"
    });

    // Old state was 60 marks
    const snapshot = await RecordSnapshot.create({
      collectionName: "results",
      modelName: "Results",
      recordId: result._id,
      data: { ...result.toObject(), totalMarks: 60, grade: "B" },
      operation: "update",
      editor: teacherUser._id
    });

    const res = await request(app)
      .post(`/api/snapshots/${snapshot._id}/restore`)
      .set("Authorization", `Bearer ${adminToken}`);

    console.log("RESTORE RES BODY:", res.body);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.totalMarks, 60);
    assert.strictEqual(res.body.data.grade, "B");

    // Verify it created a NEW snapshot for the restore operation!
    const snapshots = await RecordSnapshot.find({ recordId: result._id }).sort({ createdAt: -1 });
    assert.strictEqual(snapshots.length, 2);
    assert.strictEqual(snapshots[0].data.totalMarks, 95); // The state right before restore
  });
});
