import mongoose from "mongoose";
import assert from "node:assert";
import WorkflowEngine from "../engine/WorkflowEngine.js";
import WorkflowDef from "../models/WorkflowDef.model.js";
import WorkflowStep from "../models/WorkflowStep.model.js";
import WorkflowInstance from "../models/WorkflowInstance.model.js";
import WorkflowAuditLog from "../models/WorkflowAuditLog.model.js";

async function runTests() {
  console.log("Running WorkflowEngine Extensive Tests...");

  await testValidDAG();
  await testInvalidDAG();
  await testStartWorkflowSuccess();
  await testStartWorkflowInvalidDef();
  await testStartWorkflowNoInitialStep();
  await testProcessActionSuccessApprove();
  await testProcessActionSuccessReject();
  await testProcessActionInvalidAction();
  await testProcessActionAlreadyCompleted();
  await testProcessActionInvalidInstance();
  
  console.log("✅ All WorkflowEngine tests passed successfully!");
}

// Mocks
const originalFindByIdDef = WorkflowDef.findById;
const originalFindOneStep = WorkflowStep.findOne;
const originalFindSteps = WorkflowStep.find;
const originalCreateInstance = WorkflowInstance.create;
const originalFindByIdInstance = WorkflowInstance.findById;
const originalCreateAudit = WorkflowAuditLog.create;

function resetMocks() {
  WorkflowDef.findById = originalFindByIdDef;
  WorkflowStep.findOne = originalFindOneStep;
  WorkflowStep.find = originalFindSteps;
  WorkflowInstance.create = originalCreateInstance;
  WorkflowInstance.findById = originalFindByIdInstance;
  WorkflowAuditLog.create = originalCreateAudit;
}

// ------------------------------------------------------------------
// DAG Validation Tests
// ------------------------------------------------------------------
async function testValidDAG() {
  const mockId = new mongoose.Types.ObjectId();
  WorkflowStep.find = async () => [
    { stepId: "step_1", onApproveNextStepId: "step_2", onRejectNextStepId: null },
    { stepId: "step_2", onApproveNextStepId: "step_3", onRejectNextStepId: null },
    { stepId: "step_3", onApproveNextStepId: null, onRejectNextStepId: null },
  ];
  
  const isValid = await WorkflowEngine.validateDAG(mockId);
  assert.strictEqual(isValid, true, "DAG should be valid");
  resetMocks();
}

async function testInvalidDAG() {
  const mockId = new mongoose.Types.ObjectId();
  WorkflowStep.find = async () => [
    { stepId: "step_1", onApproveNextStepId: "step_2", onRejectNextStepId: null },
    { stepId: "step_2", onApproveNextStepId: "step_3", onRejectNextStepId: "step_1" }, // Cycle!
    { stepId: "step_3", onApproveNextStepId: null, onRejectNextStepId: null },
  ];

  let threw = false;
  try {
    await WorkflowEngine.validateDAG(mockId);
  } catch (err) {
    threw = true;
    assert.ok(err.message.includes("Cycle detected"), "Should detect cycle");
  }
  assert.ok(threw, "Expected validateDAG to throw an error due to cycle");
  resetMocks();
}

// ------------------------------------------------------------------
// startWorkflow Tests
// ------------------------------------------------------------------
async function testStartWorkflowSuccess() {
  const mockDefId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const mockInitialStepId = new mongoose.Types.ObjectId();

  WorkflowDef.findById = async () => ({ _id: mockDefId, isActive: true });
  WorkflowStep.findOne = async (query) => {
    if (query.isInitial) return { _id: mockInitialStepId, stepId: "step_1" };
    return null;
  };
  WorkflowInstance.create = async (data) => ({ _id: new mongoose.Types.ObjectId(), ...data });
  WorkflowAuditLog.create = async () => ({});

  const instance = await WorkflowEngine.startWorkflow(mockDefId, mockUserId, { test: "data" });
  assert.strictEqual(instance.status, "Pending");
  assert.strictEqual(instance.currentStep.toString(), mockInitialStepId.toString());
  resetMocks();
}

async function testStartWorkflowInvalidDef() {
  const mockDefId = new mongoose.Types.ObjectId();
  WorkflowDef.findById = async () => null; // Def not found

  try {
    await WorkflowEngine.startWorkflow(mockDefId, "user1", {});
    assert.fail("Should have thrown error");
  } catch (err) {
    assert.strictEqual(err.message, "Invalid or inactive workflow definition");
  }
  resetMocks();
}

async function testStartWorkflowNoInitialStep() {
  const mockDefId = new mongoose.Types.ObjectId();
  WorkflowDef.findById = async () => ({ _id: mockDefId, isActive: true });
  WorkflowStep.findOne = async () => null; // No initial step

  try {
    await WorkflowEngine.startWorkflow(mockDefId, "user1", {});
    assert.fail("Should have thrown error");
  } catch (err) {
    assert.strictEqual(err.message, "Workflow definition has no initial step");
  }
  resetMocks();
}

// ------------------------------------------------------------------
// processAction Tests
// ------------------------------------------------------------------
async function testProcessActionSuccessApprove() {
  const mockInstanceId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const mockCurrentStepId = new mongoose.Types.ObjectId();
  const mockNextStepId = new mongoose.Types.ObjectId();

  let saved = false;
  
  WorkflowInstance.findById = () => ({
    populate: async () => ({
      _id: mockInstanceId,
      status: "Pending",
      workflowDef: new mongoose.Types.ObjectId(),
      currentStep: {
        _id: mockCurrentStepId,
        onApproveNextStepId: "step_2"
      },
      save: async function() { saved = true; return this; }
    })
  });

  WorkflowStep.findOne = async () => ({ _id: mockNextStepId, stepId: "step_2" });
  WorkflowAuditLog.create = async () => ({});

  const updatedInstance = await WorkflowEngine.processAction(mockInstanceId, mockUserId, "Approved", "Looks good");
  assert.strictEqual(saved, true);
  assert.strictEqual(updatedInstance.currentStep.toString(), mockNextStepId.toString());
  assert.strictEqual(updatedInstance.status, "Pending"); // Overall status still pending since there's a next step
  resetMocks();
}

async function testProcessActionSuccessReject() {
  const mockInstanceId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  
  let saved = false;
  
  WorkflowInstance.findById = () => ({
    populate: async () => ({
      _id: mockInstanceId,
      status: "Pending",
      workflowDef: new mongoose.Types.ObjectId(),
      currentStep: {
        _id: new mongoose.Types.ObjectId(),
        onRejectNextStepId: null // Rejection ends workflow
      },
      save: async function() { saved = true; return this; }
    })
  });

  WorkflowAuditLog.create = async () => ({});

  const updatedInstance = await WorkflowEngine.processAction(mockInstanceId, mockUserId, "Rejected", "Denied");
  assert.strictEqual(saved, true);
  assert.strictEqual(updatedInstance.currentStep, null);
  assert.strictEqual(updatedInstance.status, "Rejected"); // Overall status changes
  resetMocks();
}

async function testProcessActionInvalidAction() {
  try {
    await WorkflowEngine.processAction("inst1", "user1", "SomethingElse", "");
    assert.fail("Should have thrown error");
  } catch (err) {
    assert.strictEqual(err.message, "Action must be either Approved or Rejected");
  }
  resetMocks();
}

async function testProcessActionAlreadyCompleted() {
  const mockInstanceId = new mongoose.Types.ObjectId();
  
  WorkflowInstance.findById = () => ({
    populate: async () => ({
      _id: mockInstanceId,
      status: "Approved", // Already completed
      currentStep: null
    })
  });

  try {
    await WorkflowEngine.processAction(mockInstanceId, "user1", "Approved", "");
    assert.fail("Should have thrown error");
  } catch (err) {
    assert.strictEqual(err.message, "Workflow instance is not pending or already completed");
  }
  resetMocks();
}

async function testProcessActionInvalidInstance() {
  WorkflowInstance.findById = () => ({ populate: async () => null }); // Not found

  try {
    await WorkflowEngine.processAction(new mongoose.Types.ObjectId(), "user1", "Approved", "");
    assert.fail("Should have thrown error");
  } catch (err) {
    assert.strictEqual(err.message, "Workflow instance not found");
  }
  resetMocks();
}

export default runTests;
