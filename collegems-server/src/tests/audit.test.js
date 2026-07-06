import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

// Load routes & controllers
import auditLogRoutes from "../routes/auditLog.routes.js";
import AuditLog from "../models/AuditLog.model.js";
import User from "../models/User.model.js";
import { logAction } from "../utils/auditService.js";

// Mock Express App
const app = express();
app.use(express.json());

// Set up mock auth middleware to inject user
const mockProtect = (req, res, next) => {
  req.user = { id: req.headers["x-user-id"], role: req.headers["x-user-role"] };
  next();
};

const mockRestrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

// Override the actual middleware imported inside auditLog.routes (since we can't easily mock ESM imports dynamically without loaders, we'll mount the controller directly for the test, or just test the service and controller functions)

// Let's test the service and controller directly to avoid ESM mocking complexity.
import { getAuditLogs, exportAuditLogs } from "../controllers/auditLog.controller.js";

let mongoServer;

test("Audit Log System", async (t) => {
  await t.test("Setup", async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  let adminUser;
  let studentUser;

  await t.test("Seed Users", async () => {
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@college.edu",
      password: "password123",
      role: "hod",
      departmentCode: "CS",
    });

    studentUser = await User.create({
      name: "Student User",
      email: "student@college.edu",
      password: "password123",
      role: "student",
      studentId: "S101",
      semester: "1",
      course: "BTech",
    });
  });

  await t.test("Service: logAction creates an audit log", async () => {
    await logAction(adminUser._id, "TEST_ACTION", "TestModule", "Target123", { key: "value" });

    const logs = await AuditLog.find({});
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].action, "TEST_ACTION");
    assert.strictEqual(logs[0].module, "TestModule");
    assert.strictEqual(logs[0].target, "Target123");
    assert.deepStrictEqual(logs[0].details, { key: "value" });
    assert.strictEqual(logs[0].user.toString(), adminUser._id.toString());
  });

  await t.test("Controller: getAuditLogs fetches logs with pagination and filters", async () => {
    // Add more logs
    await logAction(studentUser._id, "LOGIN", "Auth", studentUser._id, {});
    await logAction(adminUser._id, "UPDATE_FEE", "Fee", studentUser._id, { amount: 100 });

    // Mock Express Request & Response
    let responseData = null;
    const req = {
      query: { module: "Fee" },
      user: { id: adminUser._id, role: "hod" },
    };
    const res = {
      status: (code) => res,
      json: (data) => { responseData = data; },
    };

    await getAuditLogs(req, res);

    assert.ok(responseData, "Response data should not be null");
    assert.strictEqual(responseData.logs.length, 1);
    assert.strictEqual(responseData.logs[0].action, "UPDATE_FEE");
    assert.strictEqual(responseData.totalLogs, 1);
  });

  await t.test("Teardown", async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
});
