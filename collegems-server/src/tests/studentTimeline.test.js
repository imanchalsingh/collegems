import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/User.model.js";
import StudentTimelineEvent from "../models/StudentTimelineEvent.model.js";

let mongoServer;

describe("Student Timeline Plugin Tests", () => {
  let studentId;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const user = await User.create({
      name: "John History",
      email: "history@example.com",
      password: "password123",
      role: "student",
      studentId: "STU111",
      phone: "1234567890",
      course: "Computer Science",
      semester: "1"
    });
    studentId = user._id;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a timeline event when a tracked field is modified via .save()", async () => {
    const student = await User.findById(studentId);
    student.course = "Information Technology";
    student.semester = "2";
    await student.save();

    // Verify events were created
    const events = await StudentTimelineEvent.find({ student: studentId }).sort({ field: 1 });
    assert.strictEqual(events.length, 2);
    
    assert.strictEqual(events[0].field, "course");
    assert.strictEqual(events[0].oldValue, "Computer Science");
    assert.strictEqual(events[0].newValue, "Information Technology");

    assert.strictEqual(events[1].field, "semester");
    assert.strictEqual(events[1].oldValue, "1");
    assert.strictEqual(events[1].newValue, "2");
  });

  it("should NOT create a timeline event when an untracked field is modified via .save()", async () => {
    const countBefore = await StudentTimelineEvent.countDocuments({ student: studentId });

    const student = await User.findById(studentId);
    student.name = "John History Modified"; // Name is not a tracked field
    await student.save();

    const countAfter = await StudentTimelineEvent.countDocuments({ student: studentId });
    assert.strictEqual(countAfter, countBefore);
  });

  it("should create a timeline event when updated via findOneAndUpdate()", async () => {
    await User.findOneAndUpdate(
      { _id: studentId },
      { $set: { phone: "0987654321" } },
      { new: true }
    );

    const event = await StudentTimelineEvent.findOne({ student: studentId, field: "phone" });
    assert.ok(event);
    assert.strictEqual(event.oldValue, "1234567890");
    assert.strictEqual(event.newValue, "0987654321");
  });
});
