import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { submitAppeal, reviewAppeal } from "../controllers/plagiarism.controller.js";
import PlagiarismReport from "../models/PlagiarismReport.model.js";
import PlagiarismAppeal from "../models/PlagiarismAppeal.model.js";
import Assignment from "../models/Assignment.model.js";

let mongoServer;

// Mock Response Object
class MockRes {
  constructor() {
    this.statusCode = 200;
    this.body = null;
  }
  status(code) {
    this.statusCode = code;
    return this;
  }
  json(data) {
    this.body = data;
    return this;
  }
}

describe("Plagiarism Appeals Workflow Tests", () => {
  let studentId, teacherId, assignmentId, reportId, appealId;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    studentId = new mongoose.Types.ObjectId();
    teacherId = new mongoose.Types.ObjectId();
    assignmentId = new mongoose.Types.ObjectId();

    // Setup Mock Assignment
    await Assignment.create({
      _id: assignmentId,
      title: "Test Assignment",
      course: new mongoose.Types.ObjectId(),
      teacher: teacherId,
      dueDate: new Date(),
    });

    // Setup Mock Flagged Report
    const report = await PlagiarismReport.create({
      assignment: assignmentId,
      student: studentId,
      overallSimilarity: 85,
      threshold: 40,
      flagged: true,
      status: "pending_review",
    });
    reportId = report._id;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should allow a student to submit a justification appeal for a flagged report", async () => {
    const req = {
      user: { id: studentId.toString() },
      body: {
        reportId: reportId.toString(),
        justification: "I used boilerplate code provided in the lecture template.",
      },
    };
    const res = new MockRes();

    await submitAppeal(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.appeal.justification, "I used boilerplate code provided in the lecture template.");
    assert.strictEqual(res.body.appeal.status, "pending");
    
    appealId = res.body.appeal._id;

    // Ensure report status changed to pending_review
    const updatedReport = await PlagiarismReport.findById(reportId);
    assert.strictEqual(updatedReport.status, "pending_review");
  });

  it("should prevent submitting multiple active appeals for the same report", async () => {
    const req = {
      user: { id: studentId.toString() },
      body: {
        reportId: reportId.toString(),
        justification: "Another appeal attempt.",
      },
    };
    const res = new MockRes();

    await submitAppeal(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes("active appeal already exists"));
  });

  it("should allow a teacher to review and approve an appeal, clearing the plagiarism flag", async () => {
    const req = {
      user: { id: teacherId.toString() },
      params: { id: appealId.toString() },
      body: {
        status: "approved",
        reviewNotes: "Template boilerplate verified. Score adjusted.",
      },
    };
    const res = new MockRes();

    await reviewAppeal(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.appeal.status, "approved");

    // Ensure the original report is now cleared
    const clearedReport = await PlagiarismReport.findById(reportId);
    assert.strictEqual(clearedReport.flagged, false);
    assert.strictEqual(clearedReport.status, "cleared");
    assert.ok(clearedReport.reviewNotes.includes("Template boilerplate verified"));
  });
});
