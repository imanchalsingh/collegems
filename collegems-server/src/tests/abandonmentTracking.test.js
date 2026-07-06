import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import FormAbandonment from "../models/FormAbandonment.model.js";
import User from "../models/User.model.js";
import * as abandonmentController from "../controllers/abandonment.controller.js";

const mockReq = (options = {}) => ({
  params: {},
  body: {},
  query: {},
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

describe("Form Abandonment Tracker Tests", () => {
  let mongoServer;
  let user, admin;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    user = await User.create({
      name: "Test User",
      email: "student@abandon.test",
      password: "password",
      role: "student",
      course: "BCA",
      semester: "3",
    });

    admin = await User.create({
      name: "Test Admin",
      email: "admin@abandon.test",
      password: "password",
      role: "admin",
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await FormAbandonment.deleteMany({});
  });

  it("should successfully start a new form session", async () => {
    const req = mockReq({
      user,
      body: { formId: "leave_request" },
    });
    const res = mockRes();

    await abandonmentController.startFormSession(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.sessionId);

    const session = await FormAbandonment.findById(res.body.sessionId);
    assert.strictEqual(session.status, "in_progress");
    assert.strictEqual(session.formId, "leave_request");
    assert.strictEqual(session.userId.toString(), user._id.toString());
  });

  it("should update an existing session", async () => {
    // 1. Start
    const startReq = mockReq({ user, body: { formId: "exam_form" } });
    const startRes = mockRes();
    await abandonmentController.startFormSession(startReq, startRes);
    const sessionId = startRes.body.sessionId;

    // 2. Update
    const updateReq = mockReq({
      user,
      params: { id: sessionId },
      body: { lastCompletedField: "email", completionPercentage: 50 },
    });
    const updateRes = mockRes();
    await abandonmentController.updateFormSession(updateReq, updateRes);

    assert.strictEqual(updateRes.statusCode, 200);

    const session = await FormAbandonment.findById(sessionId);
    assert.strictEqual(session.lastCompletedField, "email");
    assert.strictEqual(session.completionPercentage, 50);
  });

  it("should submit a form session and prevent further updates", async () => {
    const startReq = mockReq({ user, body: { formId: "exam_form" } });
    const startRes = mockRes();
    await abandonmentController.startFormSession(startReq, startRes);
    const sessionId = startRes.body.sessionId;

    const submitReq = mockReq({ user, params: { id: sessionId } });
    const submitRes = mockRes();
    await abandonmentController.submitFormSession(submitReq, submitRes);

    assert.strictEqual(submitRes.statusCode, 200);

    const session = await FormAbandonment.findById(sessionId);
    assert.strictEqual(session.status, "submitted");
    assert.strictEqual(session.completionPercentage, 100);

    // Further updates should be ignored
    const updateReq = mockReq({
      user,
      params: { id: sessionId },
      body: { lastCompletedField: "hacked", status: "abandoned" },
    });
    const updateRes = mockRes();
    await abandonmentController.updateFormSession(updateReq, updateRes);

    const checkSession = await FormAbandonment.findById(sessionId);
    assert.strictEqual(checkSession.status, "submitted");
  });

  it("should correctly calculate stats (including implicit abandonment)", async () => {
    // Create 1 completed
    const session1 = await FormAbandonment.create({
      formId: "complaint",
      userId: user._id,
      status: "submitted",
      completionPercentage: 100,
      lastCompletedField: "submitBtn",
    });

    // Create 1 active in_progress (created just now)
    const session2 = await FormAbandonment.create({
      formId: "complaint",
      userId: user._id,
      status: "in_progress",
      lastCompletedField: "subject",
    });

    // Create 1 explicit abandoned
    const session3 = await FormAbandonment.create({
      formId: "complaint",
      userId: user._id,
      status: "abandoned",
      lastCompletedField: "description",
    });

    // Create 1 implicit abandoned (in_progress but very old)
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const session4 = await FormAbandonment.create({
      formId: "complaint",
      userId: user._id,
      status: "in_progress",
      lastCompletedField: "description",
      lastActiveAt: oldDate,
    });

    const req = mockReq({ user: admin, query: { formId: "complaint" } });
    const res = mockRes();

    await abandonmentController.getFormStats(req, res);

    assert.strictEqual(res.statusCode, 200);
    const stats = res.body.data[0];
    
    assert.strictEqual(stats.totalStarted, 4);
    assert.strictEqual(stats.completed, 1);
    assert.strictEqual(stats.inProgress, 1); // Only session2 is truly in_progress
    assert.strictEqual(stats.abandoned, 2); // session3 + session4

    assert.strictEqual(stats.completionRate, 25); // 1/4 * 100
    assert.strictEqual(stats.abandonmentRate, 50); // 2/4 * 100

    // Check dropOff frequencies (description: 2)
    const dropOffs = stats.commonDropOffs;
    assert.strictEqual(dropOffs.length, 1);
    assert.strictEqual(dropOffs[0].field, "description");
    assert.strictEqual(dropOffs[0].count, 2);
  });
});
