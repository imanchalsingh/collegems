import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/User.model.js";
import Course from "../models/Course.model.js";

import * as ownershipController from "../controllers/ownership.controller.js";

// Mock req and res for testing controllers directly
const mockReq = (options = {}) => ({
  params: {},
  body: {},
  user: {},
  ...options,
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

describe("Record Ownership Transfer Tests", () => {
  let mongoServer;
  let adminUser, hodUser, teacher1, teacher2, student1;
  let testCourse;

  before(async () => {
    // Start MongoMemoryServer
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create users with different roles
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@ownership.test.com",
      password: "password123",
      role: "admin",
      department: "Management",
    });

    hodUser = await User.create({
      name: "HOD User",
      email: "hod@ownership.test.com",
      password: "password123",
      role: "hod",
      department: "Computer Science",
    });

    teacher1 = await User.create({
      name: "Teacher One",
      email: "teacher1@ownership.test.com",
      password: "password123",
      role: "teacher",
      department: "Computer Science",
    });

    teacher2 = await User.create({
      name: "Teacher Two",
      email: "teacher2@ownership.test.com",
      password: "password123",
      role: "teacher",
      department: "Computer Science",
    });

    student1 = await User.create({
      name: "Student One",
      email: "student1@ownership.test.com",
      password: "password123",
      role: "student",
      department: "Computer Science",
      course: "BTech",
      semester: "3",
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear out courses and recreate
    await Course.deleteMany({});
    
    // Create a new course initialized by teacher1 (tests pre-save hook)
    testCourse = await Course.create({
      name: "Introduction to Algorithms",
      code: "CS301",
      department: "Computer Science",
      semester: 3,
      teacher: teacher1._id,
      createdBy: teacher1._id, // ownershipPlugin should auto-set ownerId to this
    });
  });

  it("should initialize ownerId to createdBy via ownershipPlugin hook", async () => {
    const course = await Course.findById(testCourse._id);
    assert.ok(course.ownerId);
    assert.strictEqual(course.ownerId.toString(), teacher1._id.toString());
    assert.strictEqual(course.ownershipHistory.length, 0);
  });

  it("should get ownership info", async () => {
    const req = mockReq({
      params: { modelName: "Course", recordId: testCourse._id.toString() },
    });
    const res = mockRes();

    await ownershipController.getOwnershipInfo(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.owner._id.toString(), teacher1._id.toString());
    assert.strictEqual(res.body.data.owner.name, "Teacher One");
  });

  it("should allow owner to transfer ownership", async () => {
    const req = mockReq({
      user: teacher1,
      body: {
        modelName: "Course",
        recordId: testCourse._id.toString(),
        newOwnerId: teacher2._id.toString(),
        reason: "Taking leave next semester",
      },
    });
    const res = mockRes();

    await ownershipController.transferOwnership(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    const updatedCourse = await Course.findById(testCourse._id);
    assert.strictEqual(updatedCourse.ownerId.toString(), teacher2._id.toString());
    assert.strictEqual(updatedCourse.ownershipHistory.length, 1);
    assert.strictEqual(updatedCourse.ownershipHistory[0].previousOwnerId.toString(), teacher1._id.toString());
    assert.strictEqual(updatedCourse.ownershipHistory[0].newOwnerId.toString(), teacher2._id.toString());
    assert.strictEqual(updatedCourse.ownershipHistory[0].reason, "Taking leave next semester");
  });

  it("should allow admin to transfer ownership", async () => {
    // Current owner is teacher1. Admin transfers it to teacher2.
    const req = mockReq({
      user: adminUser,
      body: {
        modelName: "Course",
        recordId: testCourse._id.toString(),
        newOwnerId: teacher2._id.toString(),
        reason: "Admin reassignment",
      },
    });
    const res = mockRes();

    await ownershipController.transferOwnership(req, res);

    assert.strictEqual(res.statusCode, 200);
    const updatedCourse = await Course.findById(testCourse._id);
    assert.strictEqual(updatedCourse.ownerId.toString(), teacher2._id.toString());
  });

  it("should prevent non-owners and non-admins from transferring ownership", async () => {
    // Current owner is teacher1. teacher2 tries to steal it.
    const req = mockReq({
      user: teacher2,
      body: {
        modelName: "Course",
        recordId: testCourse._id.toString(),
        newOwnerId: teacher2._id.toString(),
        reason: "I want this course",
      },
    });
    const res = mockRes();

    await ownershipController.transferOwnership(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Not authorized to transfer ownership of this record");

    // Ownership should not have changed
    const unchangedCourse = await Course.findById(testCourse._id);
    assert.strictEqual(unchangedCourse.ownerId.toString(), teacher1._id.toString());
  });

  it("should prevent transferring ownership to a non-staff user (student)", async () => {
    const req = mockReq({
      user: teacher1, // Owner
      body: {
        modelName: "Course",
        recordId: testCourse._id.toString(),
        newOwnerId: student1._id.toString(), // Student
      },
    });
    const res = mockRes();

    await ownershipController.transferOwnership(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, "New owner must be a staff member");
  });

  it("should throw error if model does not support ownership", async () => {
    const req = mockReq({
      params: { modelName: "User", recordId: student1._id.toString() }, // User model doesn't use ownershipPlugin
    });
    const res = mockRes();

    await ownershipController.getOwnershipInfo(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /does not support ownership tracking/);
  });
});
