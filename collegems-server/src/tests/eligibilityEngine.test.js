import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { evaluateEligibility } from "../services/eligibilityEngine.js";
import EligibilityRule from "../models/EligibilityRule.model.js";
import EligibilityOverride from "../models/EligibilityOverride.model.js";

let mongoServer;

describe("Eligibility Engine Tests", () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Mock Rules
    await EligibilityRule.create([
      {
        module: 'ExamForm',
        type: 'ATTENDANCE',
        threshold: 75,
        comparison: '>=',
        message: 'Attendance is {value}%, requires at least {threshold}%'
      },
      {
        module: 'ExamForm',
        type: 'FEE_DUE',
        threshold: 0,
        comparison: '<=',
        message: 'Outstanding fee balance of ${value}'
      }
    ]);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should fail validation if attendance is below threshold", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const context = { attendancePercentage: 60, feeDueBalance: 0 };
    
    const result = await evaluateEligibility(studentId, 'ExamForm', context);
    
    assert.strictEqual(result.isEligible, false);
    assert.strictEqual(result.failedCriteria.length, 1);
    assert.strictEqual(result.failedCriteria[0].code, 'ATTENDANCE');
    assert.ok(result.failedCriteria[0].message.includes('60%'));
  });

  it("should pass validation if all criteria are met", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const context = { attendancePercentage: 80, feeDueBalance: 0 };
    
    const result = await evaluateEligibility(studentId, 'ExamForm', context);
    
    assert.strictEqual(result.isEligible, true);
    assert.strictEqual(result.failedCriteria.length, 0);
  });

  it("should fail validation if multiple criteria are unmet", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const context = { attendancePercentage: 65, feeDueBalance: 500 };
    
    const result = await evaluateEligibility(studentId, 'ExamForm', context);
    
    assert.strictEqual(result.isEligible, false);
    assert.strictEqual(result.failedCriteria.length, 2);
  });

  it("should pass validation if HOD override is present despite failing criteria", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const context = { attendancePercentage: 65, feeDueBalance: 500 };
    
    // Create Override
    await EligibilityOverride.create({
      studentId: studentId,
      module: 'ExamForm',
      authorizedBy: new mongoose.Types.ObjectId(),
      reason: 'Medical Exception'
    });

    const result = await evaluateEligibility(studentId, 'ExamForm', context);
    
    assert.strictEqual(result.isEligible, true);
    assert.strictEqual(result.overridden, true);
    assert.strictEqual(result.reason, 'HOD Override applied');
  });

  it("should pass validation implicitly if no rules are configured for a module", async () => {
    const studentId = new mongoose.Types.ObjectId();
    const context = { cgpa: 5.0 };
    
    const result = await evaluateEligibility(studentId, 'Library', context);
    
    assert.strictEqual(result.isEligible, true);
  });
});
