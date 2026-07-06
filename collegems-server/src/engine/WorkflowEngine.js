import WorkflowDef from "../models/WorkflowDef.model.js";
import WorkflowStep from "../models/WorkflowStep.model.js";
import WorkflowInstance from "../models/WorkflowInstance.model.js";
import WorkflowAuditLog from "../models/WorkflowAuditLog.model.js";

class WorkflowEngine {
  /**
   * Starts a new workflow instance.
   */
  async startWorkflow(workflowDefId, userId, formData) {
    // 1. Validate Workflow Def
    const workflowDef = await WorkflowDef.findById(workflowDefId);
    if (!workflowDef || !workflowDef.isActive) {
      throw new Error("Invalid or inactive workflow definition");
    }

    // 2. Find the initial step
    const initialStep = await WorkflowStep.findOne({
      workflowDef: workflowDefId,
      isInitial: true,
    });

    if (!initialStep) {
      throw new Error("Workflow definition has no initial step");
    }

    // 3. Create Instance
    const instance = await WorkflowInstance.create({
      workflowDef: workflowDefId,
      requester: userId,
      formData: formData,
      currentStep: initialStep._id,
      status: "Pending",
    });

    // 4. Create Audit Log
    await WorkflowAuditLog.create({
      workflowInstance: instance._id,
      actionBy: userId,
      step: initialStep._id,
      action: "Started",
      comments: "Workflow initiated.",
    });

    return instance;
  }

  /**
   * Processes an action (Approve/Reject) on an existing instance.
   */
  async processAction(instanceId, userId, action, comments) {
    if (!["Approved", "Rejected"].includes(action)) {
      throw new Error("Action must be either Approved or Rejected");
    }

    const instance = await WorkflowInstance.findById(instanceId).populate("currentStep");
    if (!instance) {
      throw new Error("Workflow instance not found");
    }

    if (instance.status !== "Pending" || !instance.currentStep) {
      throw new Error("Workflow instance is not pending or already completed");
    }

    const currentStep = instance.currentStep;

    // NOTE: In a real app, you would validate here if the `userId` has the `currentStep.approverRole`

    // 1. Create Audit Log
    await WorkflowAuditLog.create({
      workflowInstance: instance._id,
      actionBy: userId,
      step: currentStep._id,
      action: action,
      comments: comments || "",
    });

    // 2. Determine next step
    let nextStepIdStr = null;
    if (action === "Approved") {
      nextStepIdStr = currentStep.onApproveNextStepId;
    } else if (action === "Rejected") {
      nextStepIdStr = currentStep.onRejectNextStepId;
    }

    if (nextStepIdStr) {
      // Find the next step object
      const nextStep = await WorkflowStep.findOne({
        workflowDef: instance.workflowDef,
        stepId: nextStepIdStr,
      });

      if (!nextStep) {
        throw new Error(`Next step '${nextStepIdStr}' not found in workflow definition`);
      }

      instance.currentStep = nextStep._id;
      // If the next step is final, you might want to automatically complete it
      // But usually, a step being 'final' just means the next action on it will complete the workflow.
    } else {
      // No next step defined, workflow is complete
      instance.currentStep = null;
      instance.status = action; // "Approved" or "Rejected" overall
    }

    await instance.save();
    return instance;
  }

  /**
   * Validates a workflow definition to ensure no infinite loops (cyclic dependencies).
   */
  async validateDAG(workflowDefId) {
    const steps = await WorkflowStep.find({ workflowDef: workflowDefId });
    if (!steps || steps.length === 0) return true;

    // Build adjacency list
    const graph = {};
    steps.forEach((step) => {
      graph[step.stepId] = [];
      if (step.onApproveNextStepId) graph[step.stepId].push(step.onApproveNextStepId);
      if (step.onRejectNextStepId) graph[step.stepId].push(step.onRejectNextStepId);
    });

    // Detect cycles using DFS
    const visited = new Set();
    const stack = new Set();

    const hasCycle = (node) => {
      if (stack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      stack.add(node);

      for (const neighbor of graph[node] || []) {
        if (hasCycle(neighbor)) return true;
      }

      stack.delete(node);
      return false;
    };

    for (const step of steps) {
      if (hasCycle(step.stepId)) {
        throw new Error(`Cycle detected in workflow at step: ${step.stepId}`);
      }
    }

    return true; // Valid DAG
  }
}

export default new WorkflowEngine();
