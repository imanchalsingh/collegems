import { useCallback, useEffect, useState } from "react";
import { GitBranch, ListChecks, Plus } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import api from "../api/axios";
import FormBuilderModal, { type FormFieldDraft } from "./workflow/FormBuilderModal";
import WorkflowNodeCanvas, {
  type WorkflowCanvasNodeData,
} from "./workflow/WorkflowNodeCanvas";

interface FormTemplate {
  _id: string;
  name: string;
  description?: string;
  fields: FormFieldDraft[];
}

interface WorkflowDefRow {
  _id: string;
  name: string;
  category: string;
  description?: string;
  formTemplate?: FormTemplate | string;
}

export default function WorkflowAdmin() {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [defs, setDefs] = useState<WorkflowDefRow[]>([]);
  const [selectedDefId, setSelectedDefId] = useState<string>("");
  const [showFormModal, setShowFormModal] = useState(false);

  const [workflowName, setWorkflowName] = useState("");
  const [workflowCategory, setWorkflowCategory] = useState("Leave");
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [creating, setCreating] = useState(false);
  const [canvasNodes, setCanvasNodes] = useState<Node<WorkflowCanvasNodeData>[] | undefined>();
  const [canvasEdges, setCanvasEdges] = useState<Edge[] | undefined>();
  const [message, setMessage] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    const res = await api.get<{ data: FormTemplate[] }>("/workflows/forms");
    setForms(res.data.data || []);
    if (!selectedFormId && res.data.data?.[0]) {
      setSelectedFormId(res.data.data[0]._id);
    }
  }, [selectedFormId]);

  const loadDefs = useCallback(async () => {
    const res = await api.get<{ data: WorkflowDefRow[] }>("/workflows/definitions");
    setDefs(res.data.data || []);
  }, []);

  useEffect(() => {
    loadForms().catch(console.error);
    loadDefs().catch(console.error);
  }, [loadForms, loadDefs]);

  const loadGraph = async (defId: string) => {
    setSelectedDefId(defId);
    setMessage(null);
    try {
      const res = await api.get<{
        data: {
          nodes: Array<{
            id?: string;
            stepId: string;
            stepName: string;
            nodeType: string;
            position?: { x: number; y: number };
            approverRole?: string;
            isInitial?: boolean;
            isFinal?: boolean;
            condition?: WorkflowCanvasNodeData["condition"];
            actionOutcome?: "Approved" | "Rejected";
          }>;
          edges: Array<{
            id?: string;
            source: string;
            target: string;
            kind?: string;
            label?: string;
          }>;
        };
      }>(`/workflows/definitions/${defId}/graph`);

      const nodes: Node<WorkflowCanvasNodeData>[] = (res.data.data.nodes || []).map(
        (n) => ({
          id: n.id || n.stepId,
          type: (n.nodeType as WorkflowCanvasNodeData["nodeType"]) || "approval",
          position: n.position || { x: 0, y: 0 },
          data: {
            stepId: n.stepId,
            stepName: n.stepName,
            nodeType: (n.nodeType as WorkflowCanvasNodeData["nodeType"]) || "approval",
            approverRole: n.approverRole,
            isInitial: n.isInitial,
            isFinal: n.isFinal,
            condition: n.condition,
            actionOutcome: n.actionOutcome,
          },
        })
      );
      const edges: Edge[] = (res.data.data.edges || []).map((e) => ({
        id: e.id || `${e.source}-${e.target}-${e.kind || "approve"}`,
        source: e.source,
        target: e.target,
        label: e.kind || e.label || "approve",
        data: { kind: e.kind || e.label || "approve" },
      }));
      setCanvasNodes(nodes);
      setCanvasEdges(edges);
    } catch (err) {
      console.error(err);
      setMessage("Could not load graph — start fresh on the canvas");
      setCanvasNodes(undefined);
      setCanvasEdges([]);
    }
  };

  const handleCreateDef = async () => {
    if (!workflowName.trim() || !selectedFormId) {
      setMessage("Workflow name and form template are required");
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await api.post<{ data: WorkflowDefRow }>("/workflows/definitions", {
        name: workflowName.trim(),
        category: workflowCategory,
        description: workflowDesc,
        formTemplate: selectedFormId,
      });
      const id = res.data.data._id;
      await loadDefs();
      setWorkflowName("");
      setWorkflowDesc("");
      setMessage("Definition created — design the node graph below, then Save graph");
      await loadGraph(id);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setMessage(ax.response?.data?.error || "Failed to create workflow");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveGraph = async (payload: {
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  }) => {
    if (!selectedDefId) throw new Error("Select a workflow first");
    await api.put(`/workflows/definitions/${selectedDefId}/graph`, payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Drag-and-Drop Workflow Engine
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Design Start → Role Approval → Condition → Action graphs for Leave, Fee concessions,
            and Bonafide certificates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFormModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          <ListChecks className="w-4 h-4" />
          Form builder
        </button>
      </div>

      {message && (
        <div className="text-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            New workflow definition
          </h3>
          <label className="block text-sm">
            Name *
            <input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="e.g. Leave &gt; 3 days HOD route"
            />
          </label>
          <label className="block text-sm">
            Category
            <select
              value={workflowCategory}
              onChange={(e) => setWorkflowCategory(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="Leave">Leave</option>
              <option value="FeeConcession">Fee concession</option>
              <option value="Bonafide">Bonafide certificate</option>
              <option value="Outpass">Outpass</option>
              <option value="Event">Event</option>
              <option value="Requisition">Requisition</option>
              <option value="General">General</option>
            </select>
          </label>
          <label className="block text-sm">
            Form template *
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select form…</option>
              {forms.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Description
            <input
              value={workflowDesc}
              onChange={(e) => setWorkflowDesc(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={handleCreateDef}
            disabled={creating}
            className="w-full py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create & open canvas"}
          </button>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-600" />
            Existing definitions
          </h3>
          {defs.length === 0 ? (
            <p className="text-sm text-slate-500">No workflows yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {defs.map((d) => (
                <li key={d._id}>
                  <button
                    type="button"
                    onClick={() => loadGraph(d._id)}
                    className={`w-full text-left px-2 py-2.5 text-sm hover:bg-slate-50 rounded-md ${
                      selectedDefId === d._id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="font-medium text-slate-800">{d.name}</span>
                    <span className="ml-2 text-xs text-slate-500">{d.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Node graph canvas</h3>
        <WorkflowNodeCanvas
          key={selectedDefId || "new"}
          workflowDefId={selectedDefId || null}
          initialNodes={canvasNodes}
          initialEdges={canvasEdges}
          onSave={handleSaveGraph}
        />
      </div>

      <FormBuilderModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        save={async (payload) => {
          const res = await api.post<{ data: FormTemplate }>("/workflows/forms", payload);
          await loadForms();
          return res.data.data;
        }}
        onSaved={(form) => {
          setSelectedFormId(form._id);
          setMessage(`Form “${form.name}” saved`);
        }}
      />
    </div>
  );
}
