import FormTemplate from "../models/FormTemplate.model.js";
import WorkflowDef from "../models/WorkflowDef.model.js";
import WorkflowStep from "../models/WorkflowStep.model.js";
import WorkflowInstance from "../models/WorkflowInstance.model.js";
import WorkflowAuditLog from "../models/WorkflowAuditLog.model.js";
import WorkflowEngine from "../engine/WorkflowEngine.js";

// --- Admin Controllers ---

export const createFormTemplate = async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    const form = await FormTemplate.create({
      name,
      description,
      fields,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: form });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const listFormTemplates = async (req, res) => {
  try {
    const forms = await FormTemplate.find({ isActive: { $ne: false } })
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: forms });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateFormTemplate = async (req, res) => {
  try {
    const { name, description, fields, isActive } = req.body;
    const form = await FormTemplate.findByIdAndUpdate(
      req.params.id,
      {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(fields !== undefined && { fields }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    );
    if (!form) {
      return res.status(404).json({ success: false, error: "Form not found" });
    }
    res.status(200).json({ success: true, data: form });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const createWorkflowDef = async (req, res) => {
  try {
    const { name, category, description, formTemplate } = req.body;
    const workflowDef = await WorkflowDef.create({
      name,
      category,
      description,
      formTemplate,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: workflowDef });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const listWorkflowDefs = async (req, res) => {
  try {
    const defs = await WorkflowDef.find()
      .populate("formTemplate")
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: defs });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const addWorkflowSteps = async (req, res) => {
  try {
    const { workflowDefId } = req.params;
    const { steps } = req.body;

    // Normalize stepName (UI historically sent `name`)
    const stepsData = steps.map((s) => ({
      ...s,
      stepName: s.stepName || s.name,
      workflowDef: workflowDefId,
    }));

    await WorkflowStep.insertMany(stepsData);

    try {
      await WorkflowEngine.validateDAG(workflowDefId);
    } catch (dagError) {
      await WorkflowStep.deleteMany({ workflowDef: workflowDefId });
      return res.status(400).json({ success: false, error: dagError.message });
    }

    res.status(201).json({ success: true, message: "Steps added successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const saveWorkflowGraph = async (req, res) => {
  try {
    const { workflowDefId } = req.params;
    const { nodes, edges } = req.body;
    const def = await WorkflowDef.findById(workflowDefId);
    if (!def) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }
    const steps = await WorkflowEngine.saveGraph(workflowDefId, { nodes, edges });
    res.status(200).json({
      success: true,
      message: "Workflow graph saved",
      data: { steps, version: (def.version || 1) + 1 },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getWorkflowGraph = async (req, res) => {
  try {
    const graph = await WorkflowEngine.getGraph(req.params.workflowDefId);
    res.status(200).json({ success: true, data: graph });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getInstanceAuditTrail = async (req, res) => {
  try {
    const logs = await WorkflowAuditLog.find({
      workflowInstance: req.params.instanceId,
    })
      .sort({ createdAt: 1 })
      .populate("actionBy", "name email role")
      .populate("step", "stepId stepName nodeType")
      .lean();
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// --- User Controllers ---

export const getAvailableWorkflows = async (req, res) => {
  try {
    const workflows = await WorkflowDef.find({ isActive: true }).populate(
      "formTemplate"
    );
    res.status(200).json({ success: true, data: workflows });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const submitWorkflowRequest = async (req, res) => {
  try {
    const { workflowDefId, formData } = req.body;
    const instance = await WorkflowEngine.startWorkflow(
      workflowDefId,
      req.user.id,
      formData
    );
    res.status(201).json({ success: true, data: instance });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await WorkflowInstance.find({ requester: req.user.id })
      .populate("workflowDef")
      .populate("currentStep");
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// --- Approver Controllers ---

export const getPendingApprovals = async (req, res) => {
  try {
    const userRole = req.user.role;

    const stepsForRole = await WorkflowStep.find({
      approverRole: new RegExp(`^${userRole}$`, "i"),
      $or: [
        { nodeType: "approval" },
        { nodeType: { $exists: false } },
        { nodeType: null },
      ],
    });
    const stepIds = stepsForRole.map((s) => s._id);

    const pendingInstances = await WorkflowInstance.find({
      status: "Pending",
      currentStep: { $in: stepIds },
    })
      .populate("workflowDef")
      .populate("requester", "name email")
      .populate("currentStep");

    res.status(200).json({ success: true, data: pendingInstances });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const processWorkflowAction = async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { action, comments, signature } = req.body;

    const instance = await WorkflowEngine.processAction(
      instanceId,
      req.user.id,
      action,
      comments,
      signature
    );
    res.status(200).json({ success: true, data: instance });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
