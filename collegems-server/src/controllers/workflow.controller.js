import FormTemplate from "../models/FormTemplate.model.js";
import WorkflowDef from "../models/WorkflowDef.model.js";
import WorkflowStep from "../models/WorkflowStep.model.js";
import WorkflowInstance from "../models/WorkflowInstance.model.js";
import WorkflowEngine from "../engine/WorkflowEngine.js";

// --- Admin Controllers ---

export const createFormTemplate = async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    const form = await FormTemplate.create({
      name,
      description,
      fields,
      createdBy: req.user._id, // Assuming req.user is populated by auth middleware
    });
    res.status(201).json({ success: true, data: form });
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
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: workflowDef });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const addWorkflowSteps = async (req, res) => {
  try {
    const { workflowDefId } = req.params;
    const { steps } = req.body; // Array of step definitions

    // Add workflowDef reference to all steps
    const stepsData = steps.map((s) => ({ ...s, workflowDef: workflowDefId }));
    
    // Validate DAG before fully saving if possible, or save and validate
    await WorkflowStep.insertMany(stepsData);

    try {
      await WorkflowEngine.validateDAG(workflowDefId);
    } catch (dagError) {
      // Rollback if DAG is invalid
      await WorkflowStep.deleteMany({ workflowDef: workflowDefId });
      return res.status(400).json({ success: false, error: dagError.message });
    }

    res.status(201).json({ success: true, message: "Steps added successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// --- User Controllers ---

export const getAvailableWorkflows = async (req, res) => {
  try {
    const workflows = await WorkflowDef.find({ isActive: true }).populate("formTemplate");
    res.status(200).json({ success: true, data: workflows });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const submitWorkflowRequest = async (req, res) => {
  try {
    const { workflowDefId, formData } = req.body;
    const instance = await WorkflowEngine.startWorkflow(workflowDefId, req.user._id, formData);
    res.status(201).json({ success: true, data: instance });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await WorkflowInstance.find({ requester: req.user._id })
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
    const userRole = req.user.role; // e.g., "hod", "principal"

    // Find steps where this user's role is required
    const stepsForRole = await WorkflowStep.find({ approverRole: userRole });
    const stepIds = stepsForRole.map((s) => s._id);

    // Find pending instances currently at one of those steps
    const pendingInstances = await WorkflowInstance.find({
      status: "Pending",
      currentStep: { $in: stepIds },
    })
      .populate("workflowDef")
      .populate("requester", "name email");

    res.status(200).json({ success: true, data: pendingInstances });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const processWorkflowAction = async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { action, comments } = req.body; // "Approved" or "Rejected"

    const instance = await WorkflowEngine.processAction(instanceId, req.user._id, action, comments);
    res.status(200).json({ success: true, data: instance });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
