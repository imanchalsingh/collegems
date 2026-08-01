/**
 * Dynamic approval workflow state machine (#708).
 * Supports Start → Role Approval → Condition → Action graphs with
 * conditional branching against submitted formData.
 */

import WorkflowDef from "../models/WorkflowDef.model.js";
import WorkflowStep from "../models/WorkflowStep.model.js";
import WorkflowInstance from "../models/WorkflowInstance.model.js";
import WorkflowAuditLog from "../models/WorkflowAuditLog.model.js";

const AUTO_NODE_TYPES = new Set(["start", "condition", "action"]);

/**
 * Evaluate a condition node against form data.
 * @returns {boolean}
 */
export function evaluateCondition(condition, formData = {}) {
  if (!condition || !condition.field) return true;

  const raw = formData[condition.field];
  const op = (condition.operator || "eq").toLowerCase();
  const expected = condition.value;

  const leftNum = Number(raw);
  const rightNum = Number(expected);
  const bothNumeric = !Number.isNaN(leftNum) && !Number.isNaN(rightNum);

  switch (op) {
    case "gt":
      return bothNumeric ? leftNum > rightNum : String(raw) > String(expected);
    case "gte":
      return bothNumeric ? leftNum >= rightNum : String(raw) >= String(expected);
    case "lt":
      return bothNumeric ? leftNum < rightNum : String(raw) < String(expected);
    case "lte":
      return bothNumeric ? leftNum <= rightNum : String(raw) <= String(expected);
    case "neq":
    case "ne":
      return String(raw) !== String(expected);
    case "contains":
      return String(raw ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "eq":
    default:
      return bothNumeric
        ? leftNum === rightNum
        : String(raw) === String(expected);
  }
}

function nextStepIdForAction(step, action) {
  if (action === "Approved") return step.onApproveNextStepId || step.onTrueNextStepId;
  if (action === "Rejected") return step.onRejectNextStepId || step.onFalseNextStepId;
  return null;
}

function nextStepIdForCondition(step, formData) {
  const passed = evaluateCondition(step.condition, formData);
  return passed
    ? step.onTrueNextStepId || step.onApproveNextStepId
    : step.onFalseNextStepId || step.onRejectNextStepId;
}

async function findStepByStepId(workflowDefId, stepIdStr) {
  if (!stepIdStr) return null;
  return WorkflowStep.findOne({ workflowDef: workflowDefId, stepId: stepIdStr });
}

async function writeAudit({
  instanceId,
  userId,
  stepId,
  action,
  comments,
  signature,
}) {
  await WorkflowAuditLog.create({
    workflowInstance: instanceId,
    actionBy: userId,
    step: stepId || undefined,
    action,
    comments: comments || "",
    signature: signature || undefined,
  });
}

/**
 * Advance through auto-resolvable nodes (start / condition / action)
 * until we land on an approval node or complete the workflow.
 */
export async function advanceAutoNodes(instance, userId, reason = "Auto-advance") {
  let guard = 0;
  while (instance.currentStep && guard < 25) {
    guard += 1;
    const step = await WorkflowStep.findById(instance.currentStep);
    if (!step) break;

    const nodeType = step.nodeType || "approval";

    if (nodeType === "approval") {
      break;
    }

    if (nodeType === "start") {
      const nextId = step.onApproveNextStepId || step.onTrueNextStepId;
      await writeAudit({
        instanceId: instance._id,
        userId,
        stepId: step._id,
        action: "Transitioned",
        comments: `${reason}: left start node ${step.stepId}`,
      });
      if (!nextId) {
        instance.currentStep = null;
        instance.status = "Approved";
        break;
      }
      const next = await findStepByStepId(instance.workflowDef, nextId);
      if (!next) throw new Error(`Next step '${nextId}' not found`);
      instance.currentStep = next._id;
      continue;
    }

    if (nodeType === "condition") {
      const passed = evaluateCondition(step.condition, instance.formData || {});
      const nextId = nextStepIdForCondition(step, instance.formData || {});
      await writeAudit({
        instanceId: instance._id,
        userId,
        stepId: step._id,
        action: "ConditionEvaluated",
        comments: `${reason}: ${step.condition?.field || "?"} ${step.condition?.operator || "eq"} ${step.condition?.value} → ${passed ? "TRUE" : "FALSE"}`,
      });
      if (!nextId) {
        instance.currentStep = null;
        instance.status = passed ? "Approved" : "Rejected";
        break;
      }
      const next = await findStepByStepId(instance.workflowDef, nextId);
      if (!next) throw new Error(`Next step '${nextId}' not found`);
      instance.currentStep = next._id;
      continue;
    }

    if (nodeType === "action") {
      await writeAudit({
        instanceId: instance._id,
        userId,
        stepId: step._id,
        action: "Transitioned",
        comments: `${reason}: executed action node ${step.stepName || step.stepId}`,
      });
      if (step.isFinal || !step.onApproveNextStepId) {
        instance.currentStep = null;
        instance.status = step.actionOutcome || "Approved";
        break;
      }
      const next = await findStepByStepId(
        instance.workflowDef,
        step.onApproveNextStepId
      );
      if (!next) {
        instance.currentStep = null;
        instance.status = step.actionOutcome || "Approved";
        break;
      }
      instance.currentStep = next._id;
      continue;
    }

    break;
  }

  await instance.save();
  return instance;
}

class WorkflowStateMachine {
  async startWorkflow(workflowDefId, userId, formData) {
    const workflowDef = await WorkflowDef.findById(workflowDefId);
    if (!workflowDef || !workflowDef.isActive) {
      throw new Error("Invalid or inactive workflow definition");
    }

    const initialStep = await WorkflowStep.findOne({
      workflowDef: workflowDefId,
      isInitial: true,
    });
    if (!initialStep) {
      throw new Error("Workflow definition has no initial step");
    }

    const instance = await WorkflowInstance.create({
      workflowDef: workflowDefId,
      requester: userId,
      formData: formData || {},
      currentStep: initialStep._id,
      status: "Pending",
    });

    await writeAudit({
      instanceId: instance._id,
      userId,
      stepId: initialStep._id,
      action: "Started",
      comments: "Workflow initiated.",
    });

    // Auto-walk start/condition/action until first human approval (or complete)
    return advanceAutoNodes(instance, userId, "Start");
  }

  async processAction(instanceId, userId, action, comments, signature) {
    if (!["Approved", "Rejected"].includes(action)) {
      throw new Error("Action must be either Approved or Rejected");
    }

    const instance = await WorkflowInstance.findById(instanceId).populate(
      "currentStep"
    );
    if (!instance) throw new Error("Workflow instance not found");
    if (instance.status !== "Pending" || !instance.currentStep) {
      throw new Error("Workflow instance is not pending or already completed");
    }

    const currentStep = instance.currentStep;
    const nodeType = currentStep.nodeType || "approval";

    if (nodeType !== "approval" && AUTO_NODE_TYPES.has(nodeType)) {
      throw new Error(
        `Cannot manually process auto node type '${nodeType}'. Use advance instead.`
      );
    }

    await writeAudit({
      instanceId: instance._id,
      userId,
      stepId: currentStep._id,
      action,
      comments: comments || "",
      signature: signature || undefined,
    });

    if (currentStep.isFinal && action === "Approved") {
      instance.currentStep = null;
      instance.status = "Approved";
      await instance.save();
      return instance;
    }

    if (currentStep.isFinal && action === "Rejected") {
      instance.currentStep = null;
      instance.status = "Rejected";
      await instance.save();
      return instance;
    }

    const nextStepIdStr = nextStepIdForAction(currentStep, action);

    if (!nextStepIdStr) {
      instance.currentStep = null;
      instance.status = action;
      await instance.save();
      return instance;
    }

    const nextStep = await findStepByStepId(instance.workflowDef, nextStepIdStr);
    if (!nextStep) {
      throw new Error(`Next step '${nextStepIdStr}' not found in workflow definition`);
    }

    instance.currentStep = nextStep._id;
    await instance.save();

    return advanceAutoNodes(instance, userId, `After ${action}`);
  }

  /**
   * Validate DAG including condition true/false edges.
   */
  async validateDAG(workflowDefId) {
    const steps = await WorkflowStep.find({ workflowDef: workflowDefId });
    if (!steps?.length) return true;

    const graph = {};
    for (const step of steps) {
      graph[step.stepId] = [];
      const outs = [
        step.onApproveNextStepId,
        step.onRejectNextStepId,
        step.onTrueNextStepId,
        step.onFalseNextStepId,
      ];
      for (const n of outs) {
        if (n) graph[step.stepId].push(n);
      }
    }

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

    const initials = steps.filter((s) => s.isInitial);
    if (initials.length !== 1) {
      throw new Error("Workflow must have exactly one initial (Start) step");
    }

    return true;
  }

  /**
   * Persist a visual graph: replace steps from canvas nodes/edges.
   */
  async saveGraph(workflowDefId, { nodes = [], edges = [] }) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error("Graph must include at least one node");
    }

    const edgeMap = { approve: {}, reject: {}, true: {}, false: {} };
    for (const e of edges) {
      const kind = (e.kind || e.label || "approve").toLowerCase();
      const key =
        kind === "reject" || kind === "false"
          ? kind === "false"
            ? "false"
            : "reject"
          : kind === "true"
            ? "true"
            : "approve";
      edgeMap[key][e.source] = e.target;
    }

    const stepsData = nodes.map((n) => {
      const stepId = n.stepId || n.id;
      const nodeType = n.nodeType || n.type || "approval";
      return {
        workflowDef: workflowDefId,
        stepId,
        stepName: n.stepName || n.label || stepId,
        nodeType,
        approverRole: n.approverRole || undefined,
        isInitial: Boolean(n.isInitial || nodeType === "start"),
        isFinal: Boolean(n.isFinal),
        condition: n.condition || undefined,
        actionOutcome: n.actionOutcome || undefined,
        position: n.position || { x: 0, y: 0 },
        onApproveNextStepId: edgeMap.approve[stepId] || edgeMap.true[stepId],
        onRejectNextStepId: edgeMap.reject[stepId] || edgeMap.false[stepId],
        onTrueNextStepId: edgeMap.true[stepId] || edgeMap.approve[stepId],
        onFalseNextStepId: edgeMap.false[stepId] || edgeMap.reject[stepId],
      };
    });

    // Ensure single start
    const starts = stepsData.filter((s) => s.isInitial || s.nodeType === "start");
    if (starts.length === 0) {
      stepsData[0].isInitial = true;
      stepsData[0].nodeType = stepsData[0].nodeType || "start";
    } else if (starts.length > 1) {
      throw new Error("Only one Start node is allowed");
    }

    await WorkflowStep.deleteMany({ workflowDef: workflowDefId });
    await WorkflowStep.insertMany(stepsData);
    await this.validateDAG(workflowDefId);

    await WorkflowDef.findByIdAndUpdate(workflowDefId, {
      $set: {
        graphMeta: { nodes, edges, updatedAt: new Date() },
      },
      $inc: { version: 1 },
    });

    return WorkflowStep.find({ workflowDef: workflowDefId }).lean();
  }

  async getGraph(workflowDefId) {
    const def = await WorkflowDef.findById(workflowDefId).lean();
    const steps = await WorkflowStep.find({ workflowDef: workflowDefId }).lean();

    if (def?.graphMeta?.nodes?.length) {
      return {
        nodes: def.graphMeta.nodes,
        edges: def.graphMeta.edges || [],
        steps,
        version: def.version,
      };
    }

    // Rebuild from steps if no stored layout
    const nodes = steps.map((s, i) => ({
      id: s.stepId,
      stepId: s.stepId,
      stepName: s.stepName,
      nodeType: s.nodeType || "approval",
      approverRole: s.approverRole,
      isInitial: s.isInitial,
      isFinal: s.isFinal,
      condition: s.condition,
      position: s.position || { x: 80 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 140 },
    }));

    const edges = [];
    for (const s of steps) {
      if (s.onApproveNextStepId || s.onTrueNextStepId) {
        edges.push({
          id: `${s.stepId}->${s.onApproveNextStepId || s.onTrueNextStepId}-approve`,
          source: s.stepId,
          target: s.onApproveNextStepId || s.onTrueNextStepId,
          kind: s.nodeType === "condition" ? "true" : "approve",
        });
      }
      if (s.onRejectNextStepId || s.onFalseNextStepId) {
        edges.push({
          id: `${s.stepId}->${s.onRejectNextStepId || s.onFalseNextStepId}-reject`,
          source: s.stepId,
          target: s.onRejectNextStepId || s.onFalseNextStepId,
          kind: s.nodeType === "condition" ? "false" : "reject",
        });
      }
    }

    return { nodes, edges, steps, version: def?.version };
  }
}

export default new WorkflowStateMachine();
