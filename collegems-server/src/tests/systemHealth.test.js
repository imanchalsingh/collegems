import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { getSystemHealth } from "../controllers/systemHealth.controller.js";
import User from "../models/User.model.js";
import Leave from "../models/Leave.model.js";
import Booking from "../models/Booking.model.js";
import Scholarship from "../models/Scholarship.model.js";
import Complaint from "../models/Complaint.model.js";
import ExaminationForm from "../models/ExaminationForm.model.js";

let mongoServer;

test("System Health Dashboard Analytics", async (t) => {
  await t.test("Setup", async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  await t.test("Seed and check metrics", async () => {
    // 1. Seed users
    const studentUser = await User.create({
      name: "Active Student",
      email: "stud1@college.edu",
      password: "password123",
      role: "student",
      semester: "1",
      course: "BTech",
      accountStatus: "active"
    });

    const teacherUser = await User.create({
      name: "Active Teacher",
      email: "teach1@college.edu",
      password: "password123",
      role: "teacher",
      department: "Computer Science",
      accountStatus: "active"
    });

    const archivedUser = await User.create({
      name: "Archived Student",
      email: "archived1@college.edu",
      password: "password123",
      role: "student",
      semester: "2",
      course: "BTech",
      accountStatus: "archived"
    });

    // 2. Seed pending items
    // Seed one pending leave request
    await Leave.create({
      user: studentUser._id,
      role: "student",
      subject: "Sick Leave",
      startDate: new Date(),
      endDate: new Date(),
      reason: "Flu",
      status: "Pending"
    });

    // Seed one pending booking
    const mockResourceId = new mongoose.Types.ObjectId();
    await Booking.create({
      resource: mockResourceId,
      user: studentUser._id,
      purpose: "Lab Study",
      startTime: new Date(),
      endTime: new Date(),
      status: "pending"
    });

    // Mock request and response
    let responseData = null;
    const req = {
      user: { id: teacherUser._id, role: "hod" }
    };
    const res = {
      status: (code) => {
        assert.strictEqual(code, 200);
        return res;
      },
      json: (data) => {
        responseData = data;
      }
    };

    await getSystemHealth(req, res);

    assert.ok(responseData, "Response should not be empty");
    assert.strictEqual(responseData.success, true);
    
    // Check Active Users Metrics
    assert.strictEqual(responseData.metrics.activeUsers.total, 2);
    assert.strictEqual(responseData.metrics.activeUsers.breakdown.students, 1);
    assert.strictEqual(responseData.metrics.activeUsers.breakdown.teachers, 1);

    // Check Archived Records Metrics
    assert.strictEqual(responseData.metrics.archivedRecords.total, 1);

    // Check Pending Actions Metrics
    assert.strictEqual(responseData.metrics.pendingActions.breakdown.leaves, 1);
    assert.strictEqual(responseData.metrics.pendingActions.breakdown.bookings, 1);
    assert.strictEqual(responseData.metrics.pendingActions.total, 2); // 1 leave + 1 booking

    // Check System Telemetry
    assert.strictEqual(responseData.system.dbStatus, "Healthy");
    assert.ok(responseData.system.uptime > 0);
    assert.ok(responseData.system.memory.heapUsed > 0);
  });

  await t.test("Teardown", async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
});
