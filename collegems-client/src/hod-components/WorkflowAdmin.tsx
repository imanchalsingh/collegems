import React, { useState, useEffect } from "react";
import { Plus, List, ArrowRight, Save, Trash2, CheckCircle2, Shield, Settings } from "lucide-react";
import api from "../api/axios";

export default function WorkflowAdmin() {
  const [activeTab, setActiveTab] = useState<"forms" | "workflows">("workflows");
  const [loading, setLoading] = useState(false);

  // Form Template State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<any[]>([]);

  // Workflow State
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowCategory, setWorkflowCategory] = useState("General");
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [steps, setSteps] = useState<any[]>([]);

  useEffect(() => {
    fetchWorkflows(); // We fetch workflows to extract available forms as well
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await api.get("/workflows/available");
      // Just extract form templates from available workflows for now
      // In a real app we would have a dedicated GET /forms endpoint, 
      // but we can use the ones attached to active workflows.
      const formsMap = new Map();
      res.data.data.forEach((w: any) => {
        if (w.formTemplate) formsMap.set(w.formTemplate._id, w.formTemplate);
      });
      setAvailableForms(Array.from(formsMap.values()));
    } catch (err) {
      console.error(err);
    }
  };

  const addField = () => {
    setFields([...fields, { name: "", label: "", type: "text", required: false }]);
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const handleCreateForm = async () => {
    try {
      setLoading(true);
      await api.post("/workflows/forms", {
        name: formName,
        description: formDescription,
        fields,
      });
      alert("Form created successfully! Now you can create a workflow definition for it.");
      setFormName("");
      setFormDescription("");
      setFields([]);
      setActiveTab("workflows");
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to create form");
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setSteps([...steps, {
      stepId: `step_${steps.length + 1}`,
      name: "",
      approverRole: "hod",
      isInitial: steps.length === 0,
      onApproveNextStepId: "",
      onRejectNextStepId: ""
    }]);
  };

  const updateStep = (index: number, key: string, value: any) => {
    const newSteps = [...steps];
    newSteps[index][key] = value;
    setSteps(newSteps);
  };

  const handleCreateWorkflow = async () => {
    try {
      setLoading(true);
      // 1. Create Def
      const defRes = await api.post("/workflows/definitions", {
        name: workflowName,
        category: workflowCategory,
        description: workflowDesc,
        formTemplate: selectedFormId
      });
      
      const workflowDefId = defRes.data.data._id;

      // 2. Add Steps
      await api.post(`/workflows/definitions/${workflowDefId}/steps`, {
        steps
      });

      alert("Workflow definition and steps created successfully!");
      setWorkflowName("");
      setWorkflowCategory("General");
      setWorkflowDesc("");
      setSelectedFormId("");
      setSteps([]);
      fetchWorkflows();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to create workflow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Workflow Administration</h2>
          <p className="text-slate-500 text-sm mt-1">Design forms and map multi-step approval sequences.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab("workflows")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "workflows" ? "bg-white shadow text-blue-600" : "text-slate-600 hover:bg-slate-200"}`}
          >
            Workflow Builder
          </button>
          <button 
            onClick={() => setActiveTab("forms")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "forms" ? "bg-white shadow text-blue-600" : "text-slate-600 hover:bg-slate-200"}`}
          >
            Form Templates
          </button>
        </div>
      </div>

      {activeTab === "forms" && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <List className="w-5 h-5 text-blue-500" />
            Create New Form Template
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Form Name *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Equipment Request" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-slate-700 mb-2">Form Fields</h4>
            {fields.map((field, idx) => (
              <div key={idx} className="flex gap-3 items-end mb-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Field Name (camelCase)</label>
                  <input type="text" value={field.name} onChange={e => updateField(idx, "name", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. equipmentName" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Display Label</label>
                  <input type="text" value={field.label} onChange={e => updateField(idx, "label", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. Equipment Name" />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                  <select value={field.type} onChange={e => updateField(idx, "type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input type="checkbox" checked={field.required} onChange={e => updateField(idx, "required", e.target.checked)} />
                  <span className="text-sm">Required</span>
                </div>
                <button onClick={() => setFields(fields.filter((_, i) => i !== idx))} className="pb-1 text-red-500 hover:text-red-700 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={addField} className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 mt-2 font-medium">
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={handleCreateForm} 
              disabled={loading || !formName || fields.length === 0}
              className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Form Template"} <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === "workflows" && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Define Workflow & Routing
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Workflow Name *</label>
              <input type="text" value={workflowName} onChange={e => setWorkflowName(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Leave Approval" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Linked Form Template * (requires existing workflow's form to reuse if no specific endpoint)</label>
              {/* Note: since there's no GET /forms endpoint built yet, we use the ones loaded from active workflows, or require manual input. 
                  If no forms are available, warn user. */}
              {availableForms.length > 0 ? (
                <select value={selectedFormId} onChange={e => setSelectedFormId(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                  <option value="">Select a form template...</option>
                  {availableForms.map(f => (
                    <option key={f._id} value={f._id}>{f.name}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={selectedFormId} onChange={e => setSelectedFormId(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Enter Form Template ObjectId" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input type="text" value={workflowCategory} onChange={e => setWorkflowCategory(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Academic" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={workflowDesc} onChange={e => setWorkflowDesc(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-slate-700 mb-4">Approval Chain (Steps)</h4>
            
            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                  <button onClick={() => setSteps(steps.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded">Step {idx + 1}</span>
                    <span className="text-sm font-mono text-slate-500">ID: {step.stepId}</span>
                    {step.isInitial && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium ml-auto mr-6">Initial Step</span>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Step Name</label>
                      <input type="text" value={step.name} onChange={e => updateStep(idx, "name", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. Faculty Review" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Approver Role</label>
                      <select value={step.approverRole} onChange={e => updateStep(idx, "approverRole", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                        <option value="teacher">Teacher</option>
                        <option value="hod">HOD</option>
                        <option value="admin">Admin</option>
                        <option value="principal">Principal</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border border-slate-100">
                    <div>
                      <label className="block text-xs font-medium text-emerald-600 mb-1">On Approve → Next Step ID</label>
                      <input type="text" value={step.onApproveNextStepId} onChange={e => updateStep(idx, "onApproveNextStepId", e.target.value)} className="w-full px-2 py-1.5 text-sm border border-emerald-200 focus:ring-emerald-500 rounded" placeholder="e.g. step_2 (Leave blank if final)" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-red-600 mb-1">On Reject → Next Step ID</label>
                      <input type="text" value={step.onRejectNextStepId} onChange={e => updateStep(idx, "onRejectNextStepId", e.target.value)} className="w-full px-2 py-1.5 text-sm border border-red-200 focus:ring-red-500 rounded" placeholder="e.g. step_1 (Leave blank to terminate)" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addStep} className="mt-4 text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-4 h-4" /> Add Next Step
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={handleCreateWorkflow} 
              disabled={loading || !workflowName || !selectedFormId || steps.length === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? "Publishing..." : "Publish Workflow"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
