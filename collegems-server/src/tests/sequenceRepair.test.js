import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";

import User from "../models/User.model.js";

process.env.JWT_SECRET = "test-secret";

let mongoServer;
let adminToken;
let teacherToken;
let adminUser;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  adminUser = await User.create({
    name: "Admin User",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
  });
  adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET || "test-secret");

  const teacherUser = await User.create({
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
  await User.deleteMany({ role: "student" });
});

test("Automatic Sequence Repair Tests", async (t) => {
  await t.test("API: Should analyze a sequence and detect gaps", async () => {
    // Seed records with a gap (Missing STU003)
    await User.create([
      { name: "S1", email: "s1@test.com", password: "pwd", role: "student", studentId: "STU001", course: "BCA", semester: 1 },
      { name: "S2", email: "s2@test.com", password: "pwd", role: "student", studentId: "STU002", course: "BCA", semester: 1 },
      { name: "S4", email: "s4@test.com", password: "pwd", role: "student", studentId: "STU004", course: "BCA", semester: 1 },
      { name: "S5", email: "s5@test.com", password: "pwd", role: "student", studentId: "STU005", course: "BCA", semester: 1 },
    ]);

    const res = await request(app)
      .get(`/api/sequences/analyze?model=User&field=studentId&prefix=STU&padding=3`)
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.totalRecords, 4);
    assert.deepStrictEqual(res.body.data.gaps, ["STU003"]);
    
    // Check preview
    const preview = res.body.data.preview;
    assert.strictEqual(preview.length, 2);
    
    // STU004 should shift to STU003
    assert.strictEqual(preview[0].oldValue, "STU004");
    assert.strictEqual(preview[0].newValue, "STU003");
    
    // STU005 should shift to STU004
    assert.strictEqual(preview[1].oldValue, "STU005");
    assert.strictEqual(preview[1].newValue, "STU004");
  });

  await t.test("API: Should correctly execute a sequence repair", async () => {
    // Seed records with a gap (Missing STU003)
    await User.create([
      { name: "S1", email: "s1@test.com", password: "pwd", role: "student", studentId: "STU001", course: "BCA", semester: 1 },
      { name: "S2", email: "s2@test.com", password: "pwd", role: "student", studentId: "STU002", course: "BCA", semester: 1 },
      { name: "S4", email: "s4@test.com", password: "pwd", role: "student", studentId: "STU004", course: "BCA", semester: 1 },
    ]);

    const analyzeRes = await request(app)
      .get(`/api/sequences/analyze?model=User&field=studentId&prefix=STU&padding=3`)
      .set("Authorization", `Bearer ${adminToken}`);
    
    const previewData = analyzeRes.body.data.preview;

    const repairRes = await request(app)
      .post(`/api/sequences/repair`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        model: "User",
        field: "studentId",
        prefix: "STU",
        padding: 3,
        previewData
      });

    assert.strictEqual(repairRes.status, 200);
    assert.strictEqual(repairRes.body.success, true);
    assert.strictEqual(repairRes.body.successCount, 1);

    // Verify DB update
    const updatedUser = await User.findOne({ name: "S4" });
    assert.strictEqual(updatedUser.studentId, "STU003");
  });

  await t.test("API: Should deny access to non-admin/hod", async () => {
    const res = await request(app)
      .get(`/api/sequences/analyze?model=User&field=studentId&prefix=STU&padding=3`)
      .set("Authorization", `Bearer ${teacherToken}`);
    
    assert.strictEqual(res.status, 403);
  });
});
