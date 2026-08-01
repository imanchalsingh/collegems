import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Play,
  Shield,
  GitBranch,
  Zap,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

export type CanvasNodeType = "start" | "approval" | "condition" | "action";

export interface WorkflowCanvasNodeData {
  [key: string]: unknown;
  stepId: string;
  stepName: string;
  nodeType: CanvasNodeType;
  approverRole?: string;
  isInitial?: boolean;
  isFinal?: boolean;
  condition?: { field: string; operator: string; value: string | number };
  actionOutcome?: "Approved" | "Rejected";
}

const ROLE_OPTIONS = ["teacher", "hod", "admin", "principal", "staff"];

function NodeShell({
  title,
  subtitle,
  color,
  icon,
  selected,
  children,
}: {
  title: string;
  subtitle?: string;
  color: string;
  icon: ReactNode;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`min-w-[180px] rounded-xl border-2 bg-white shadow-sm ${
        selected ? "ring-2 ring-offset-1 ring-blue-400" : ""
      }`}
      style={{ borderColor: color }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 text-white text-xs font-semibold rounded-t-[10px]"
        style={{ background: color }}
      >
        {icon}
        <span className="truncate">{title}</span>
      </div>
      {subtitle && (
        <p className="px-3 pt-2 text-[11px] text-slate-500 truncate">{subtitle}</p>
      )}
      <div className="px-3 py-2 text-xs text-slate-700">{children}</div>
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}

function StartNode({ data, selected }: NodeProps<Node<WorkflowCanvasNodeData>>) {
  return (
    <NodeShell
      title={data.stepName || "Start"}
      subtitle="Entry"
      color="#059669"
      icon={<Play className="w-3.5 h-3.5" />}
      selected={selected}
    >
      <span className="text-emerald-700">Workflow begins here</span>
    </NodeShell>
  );
}

function ApprovalNode({ data, selected }: NodeProps<Node<WorkflowCanvasNodeData>>) {
  return (
    <NodeShell
      title={data.stepName || "Approval"}
      subtitle={data.approverRole ? `Role: ${data.approverRole}` : "Role approval"}
      color="#2563eb"
      icon={<Shield className="w-3.5 h-3.5" />}
      selected={selected}
    >
      {data.isFinal ? "Final approval" : "Awaiting signature"}
    </NodeShell>
  );
}

function ConditionNode({ data, selected }: NodeProps<Node<WorkflowCanvasNodeData>>) {
  const c = data.condition;
  return (
    <NodeShell
      title={data.stepName || "Condition"}
      subtitle="Branch"
      color="#d97706"
      icon={<GitBranch className="w-3.5 h-3.5" />}
      selected={selected}
    >
      {c?.field
        ? `If ${c.field} ${c.operator} ${c.value}`
        : "Configure condition"}
    </NodeShell>
  );
}

function ActionNode({ data, selected }: NodeProps<Node<WorkflowCanvasNodeData>>) {
  return (
    <NodeShell
      title={data.stepName || "Action"}
      subtitle={data.actionOutcome || "Approved"}
      color="#7c3aed"
      icon={<Zap className="w-3.5 h-3.5" />}
      selected={selected}
    >
      Auto-complete outcome
    </NodeShell>
  );
}

const nodeTypes = {
  start: StartNode,
  approval: ApprovalNode,
  condition: ConditionNode,
  action: ActionNode,
};

interface Props {
  workflowDefId?: string | null;
  initialNodes?: Node<WorkflowCanvasNodeData>[];
  initialEdges?: Edge[];
  onSave: (payload: {
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  }) => Promise<void>;
}

let idCounter = 1;
const nid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${idCounter++}`;

export default function WorkflowNodeCanvas({
  workflowDefId,
  initialNodes,
  initialEdges,
  onSave,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowCanvasNodeData>>(
    initialNodes?.length
      ? initialNodes
      : [
          {
            id: "start_1",
            type: "start",
            position: { x: 40, y: 160 },
            data: {
              stepId: "start_1",
              stepName: "Start",
              nodeType: "start",
              isInitial: true,
            },
          },
        ]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edgeKind, setEdgeKind] = useState<"approve" | "reject" | "true" | "false">(
    "approve"
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialNodes?.length) setNodes(initialNodes);
    if (initialEdges) setEdges(initialEdges);
  }, [workflowDefId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const id = `${connection.source}-${connection.target}-${edgeKind}`;
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id,
            label: edgeKind,
            data: { kind: edgeKind },
            markerEnd: { type: MarkerType.ArrowClosed },
            style: {
              stroke:
                edgeKind === "reject" || edgeKind === "false" ? "#dc2626" : "#16a34a",
            },
          },
          eds
        )
      );
    },
    [edgeKind, setEdges]
  );

  const addNode = (nodeType: CanvasNodeType) => {
    const id = nid(nodeType);
    const defaults: Record<CanvasNodeType, Partial<WorkflowCanvasNodeData>> = {
      start: { stepName: "Start", isInitial: true },
      approval: { stepName: "Role Approval", approverRole: "hod" },
      condition: {
        stepName: "Condition",
        condition: { field: "days", operator: "gt", value: 3 },
      },
      action: { stepName: "Complete", actionOutcome: "Approved", isFinal: true },
    };
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: nodeType,
        position: { x: 120 + nds.length * 40, y: 80 + (nds.length % 3) * 100 },
        data: {
          stepId: id,
          nodeType,
          ...defaults[nodeType],
        } as WorkflowCanvasNodeData,
      },
    ]);
    setSelectedId(id);
  };

  const updateSelected = (patch: Partial<WorkflowCanvasNodeData>) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n
      )
    );
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedId && e.target !== selectedId)
    );
    setSelectedId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payloadNodes = nodes.map((n) => ({
        id: n.id,
        stepId: n.data.stepId || n.id,
        stepName: n.data.stepName,
        nodeType: n.data.nodeType || n.type,
        approverRole: n.data.approverRole,
        isInitial: n.data.nodeType === "start" || n.data.isInitial,
        isFinal: n.data.isFinal,
        condition: n.data.condition,
        actionOutcome: n.data.actionOutcome,
        position: n.position,
        label: n.data.stepName,
        type: n.data.nodeType || n.type,
      }));
      const payloadEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        kind: (e.data as { kind?: string })?.kind || e.label || "approve",
        label: e.label,
      }));
      await onSave({ nodes: payloadNodes, edges: payloadEdges });
      setMessage("Graph saved — state machine ready");
    } catch (err: unknown) {
      const ax = err as { message?: string };
      setMessage(ax.message || "Failed to save graph");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 mr-1">Add node:</span>
        <button type="button" onClick={() => addNode("start")} className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> Start
        </button>
        <button type="button" onClick={() => addNode("approval")} className="px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> Role Approval
        </button>
        <button type="button" onClick={() => addNode("condition")} className="px-2 py-1 text-xs rounded-md bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> Condition
        </button>
        <button type="button" onClick={() => addNode("action")} className="px-2 py-1 text-xs rounded-md bg-violet-50 text-violet-800 border border-violet-200 inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> Action
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-slate-500 flex items-center gap-1">
            Next edge kind
            <select
              value={edgeKind}
              onChange={(e) => setEdgeKind(e.target.value as typeof edgeKind)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="approve">Approve / True</option>
              <option value="reject">Reject</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !workflowDefId}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save graph"}
          </button>
        </div>
      </div>

      {!workflowDefId && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Create or select a workflow definition first, then save the canvas graph.
        </p>
      )}
      {message && (
        <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-3 h-[420px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">Node inspector</h4>
          {!selected ? (
            <p className="text-xs text-slate-500">Select a node to edit properties.</p>
          ) : (
            <>
              <label className="block text-xs">
                Label
                <input
                  value={selected.data.stepName || ""}
                  onChange={(e) => updateSelected({ stepName: e.target.value })}
                  className="mt-1 w-full border rounded px-2 py-1.5"
                />
              </label>
              {selected.data.nodeType === "approval" && (
                <>
                  <label className="block text-xs">
                    Approver role
                    <select
                      value={selected.data.approverRole || "hod"}
                      onChange={(e) => updateSelected({ approverRole: e.target.value })}
                      className="mt-1 w-full border rounded px-2 py-1.5"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(selected.data.isFinal)}
                      onChange={(e) => updateSelected({ isFinal: e.target.checked })}
                    />
                    Final approval step
                  </label>
                </>
              )}
              {selected.data.nodeType === "condition" && (
                <div className="space-y-2">
                  <label className="block text-xs">
                    Field
                    <input
                      value={selected.data.condition?.field || ""}
                      onChange={(e) =>
                        updateSelected({
                          condition: {
                            field: e.target.value,
                            operator: selected.data.condition?.operator || "gt",
                            value: selected.data.condition?.value ?? 3,
                          },
                        })
                      }
                      className="mt-1 w-full border rounded px-2 py-1.5"
                      placeholder="days"
                    />
                  </label>
                  <label className="block text-xs">
                    Operator
                    <select
                      value={selected.data.condition?.operator || "gt"}
                      onChange={(e) =>
                        updateSelected({
                          condition: {
                            field: selected.data.condition?.field || "days",
                            operator: e.target.value,
                            value: selected.data.condition?.value ?? 3,
                          },
                        })
                      }
                      className="mt-1 w-full border rounded px-2 py-1.5"
                    >
                      <option value="gt">&gt;</option>
                      <option value="gte">≥</option>
                      <option value="lt">&lt;</option>
                      <option value="lte">≤</option>
                      <option value="eq">=</option>
                      <option value="neq">≠</option>
                      <option value="contains">contains</option>
                    </select>
                  </label>
                  <label className="block text-xs">
                    Value
                    <input
                      value={String(selected.data.condition?.value ?? "")}
                      onChange={(e) =>
                        updateSelected({
                          condition: {
                            field: selected.data.condition?.field || "days",
                            operator: selected.data.condition?.operator || "gt",
                            value: e.target.value,
                          },
                        })
                      }
                      className="mt-1 w-full border rounded px-2 py-1.5"
                    />
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Example: If Leave days &gt; 3 → HOD, else Teacher (wire True/False edges).
                  </p>
                </div>
              )}
              {selected.data.nodeType === "action" && (
                <label className="block text-xs">
                  Outcome
                  <select
                    value={selected.data.actionOutcome || "Approved"}
                    onChange={(e) =>
                      updateSelected({
                        actionOutcome: e.target.value as "Approved" | "Rejected",
                        isFinal: true,
                      })
                    }
                    className="mt-1 w-full border rounded px-2 py-1.5"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={deleteSelected}
                className="inline-flex items-center gap-1 text-xs text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete node
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
