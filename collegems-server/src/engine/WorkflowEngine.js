/**
 * Backward-compatible facade — delegates to the dynamic state machine (#708).
 */
import workflowStateMachine from "./workflowStateMachine.js";

class WorkflowEngine {
  startWorkflow(workflowDefId, userId, formData) {
    return workflowStateMachine.startWorkflow(workflowDefId, userId, formData);
  }

  processAction(instanceId, userId, action, comments, signature) {
    return workflowStateMachine.processAction(
      instanceId,
      userId,
      action,
      comments,
      signature
    );
  }

  validateDAG(workflowDefId) {
    return workflowStateMachine.validateDAG(workflowDefId);
  }

  saveGraph(workflowDefId, graph) {
    return workflowStateMachine.saveGraph(workflowDefId, graph);
  }

  getGraph(workflowDefId) {
    return workflowStateMachine.getGraph(workflowDefId);
  }
}

export default new WorkflowEngine();
