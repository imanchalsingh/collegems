import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Announcement from "../models/Announcement.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import * as announcementController from "../controllers/announcement.controller.js";

const mockReq = (options = {}) => ({
  params: {},
  body: {},
  user: {},
  app: { get: () => null }, // Mock req.app.get("io")
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

describe("Silent Notifications Tests (Announcements)", () => {
  let mongoServer;
  let admin, student1, teacher1;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    admin = await User.create({
      name: "Admin User",
      email: "admin@silent.test",
      password: "password123",
      role: "admin",
      accountStatus: "active",
    });

    student1 = await User.create({
      name: "Student User",
      email: "student@silent.test",
      password: "password123",
      role: "student",
      course: "BCA",
      semester: "3",
      accountStatus: "active",
    });

    teacher1 = await User.create({
      name: "Teacher User",
      email: "teacher@silent.test",
      password: "password123",
      role: "teacher",
      department: "Computer Science",
      accountStatus: "active",
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Announcement.deleteMany({});
    await Notification.deleteMany({});
  });

  it("should create notifications for published, non-silent announcements", async () => {
    const req = mockReq({
      user: admin,
      body: {
        title: "Normal Announcement",
        message: "This should notify people.",
        targetRole: "all",
        status: "published",
        isSilent: false,
      },
    });
    const res = mockRes();

    await announcementController.createAnnouncement(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    
    // Wait a brief moment to allow background promise (Promise.allSettled) to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    const notifications = await Notification.find({ type: "announcement" });
    assert.ok(notifications.length > 0, "Notifications should have been created");
  });

  it("should SKIP creating notifications for silent announcements", async () => {
    const req = mockReq({
      user: admin,
      body: {
        title: "Silent Announcement",
        message: "This should NOT notify people.",
        targetRole: "all",
        status: "published",
        isSilent: true, // Key property
      },
    });
    const res = mockRes();

    await announcementController.createAnnouncement(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.isSilent, true);

    await new Promise(resolve => setTimeout(resolve, 50));

    const notifications = await Notification.find({ type: "announcement" });
    assert.strictEqual(notifications.length, 0, "No notifications should be created for silent announcements");
  });

  it("should create notifications when updating from draft to published (if not silent)", async () => {
    // 1. Create Draft
    const draftReq = mockReq({
      user: admin,
      body: {
        title: "Draft Announcement",
        message: "Still working on this.",
        targetRole: "all",
        status: "draft",
        isSilent: false,
      },
    });
    const draftRes = mockRes();
    await announcementController.createAnnouncement(draftReq, draftRes);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    let notifications = await Notification.find({ type: "announcement" });
    assert.strictEqual(notifications.length, 0, "Drafts should not trigger notifications");

    // 2. Publish the draft
    const draftId = draftRes.body.data._id;
    const pubReq = mockReq({
      user: admin,
      params: { id: draftId },
      body: {
        status: "published",
        isSilent: false,
      },
    });
    const pubRes = mockRes();
    await announcementController.updateAnnouncement(pubReq, pubRes);

    assert.strictEqual(pubRes.statusCode, 200);

    await new Promise(resolve => setTimeout(resolve, 50));
    notifications = await Notification.find({ type: "announcement" });
    assert.ok(notifications.length > 0, "Notifications should be sent upon publishing");
  });
});
