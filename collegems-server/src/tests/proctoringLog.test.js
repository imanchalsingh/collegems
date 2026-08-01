import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import ProctoringLog from "../models/ProctoringLog.model.js";

test("ProctoringLog stores violations and autosubmit flags", async (t) => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  t.after(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  await t.test("creates session with violation trail", async () => {
    const quizId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();

    const log = await ProctoringLog.create({
      sessionId: "PROC-TEST-1",
      quiz: quizId,
      student: studentId,
      studentName: "Test Student",
      quizTitle: "Midterm",
      maxWarnings: 3,
      maxViolations: 8,
      violations: [
        { type: "tab_switch", message: "left tab", at: new Date() },
        { type: "missing_face", message: "no face", at: new Date() },
      ],
    });

    assert.equal(log.violations.length, 2);
    assert.equal(log.status, "active");

    log.violations.push({ type: "multiple_faces", message: "2 faces", at: new Date() });
    log.warningCount = 1;
    log.status = "auto_submitted";
    log.autoSubmitted = true;
    await log.save();

    const reloaded = await ProctoringLog.findOne({ sessionId: "PROC-TEST-1" });
    assert.equal(reloaded.violations.length, 3);
    assert.equal(reloaded.autoSubmitted, true);
  });
});
