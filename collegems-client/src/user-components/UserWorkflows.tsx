/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Send, FileText, Clock, CheckCircle, XCircle, ArrowRight, Activity, Loader2 } from "lucide-react";
import api from "../api/axios";

export default function UserWorkflows() {
  const [activeTab, setActiveTab] = useState<"available" | "my-requests">("available");
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Submission Form State
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === "available") {
      fetchAvailableWorkflows();
    } else {
      fetchMyRequests();
    }
  }, [activeTab]);

  const fetchAvailableWorkflows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/workflows/available");
      setWorkflows(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/workflows/my-requests");
      setMyRequests(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: unknown) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflow) return;
    
    try {
      setSubmitting(true);
      await api.post("/workflows/submit", {
        workflowDefId: selectedWorkflow._id,
        formData
      });
      alert("Request submitted successfully!");
      setSelectedWorkflow(null);
      setFormData({});
      setActiveTab("my-requests");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch(status) {
      case "Approved": return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 flex items-center gap-1.5 rounded-full text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5"/> Approved</span>;
      case "Rejected": return <span className="bg-red-100 text-red-700 px-2.5 py-1 flex items-center gap-1.5 rounded-full text-xs font-semibold"><XCircle className="w-3.5 h-3.5"/> Rejected</span>;
      default: return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 flex items-center gap-1.5 rounded-full text-xs font-semibold"><Clock className="w-3.5 h-3.5"/> Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Workflow Portal</h2>
          <p className="text-slate-500 text-sm mt-1">Submit official requests and track their approval progress.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => { setActiveTab("available"); setSelectedWorkflow(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "available" && !selectedWorkflow ? "bg-white shadow text-blue-600" : "text-slate-600 hover:bg-slate-200"}`}
          >
            New Request
          </button>
          <button 
            onClick={() => { setActiveTab("my-requests"); setSelectedWorkflow(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "my-requests" && !selectedWorkflow ? "bg-white shadow text-blue-600" : "text-slate-600 hover:bg-slate-200"}`}
          >
            My Requests
          </button>
        </div>
      </div>

      {loading && !selectedWorkflow ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>
      ) : (
        <>
          {activeTab === "available" && !selectedWorkflow && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workflows.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500">No active workflows available right now.</div>
              ) : (
                workflows.map((wf: any) => (
                  <div key={wf._id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{wf.name}</h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">{wf.description || "Start this workflow to submit a request."}</p>
                    <button 
                      onClick={() => setSelectedWorkflow(wf)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 font-medium transition-colors"
                    >
                      Start Workflow <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "available" && selectedWorkflow && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden max-w-3xl mx-auto">
              <div className="bg-slate-800 text-white p-6">
                <button onClick={() => setSelectedWorkflow(null)} className="text-slate-300 hover:text-white text-sm mb-4">← Back to workflows</button>
                <h2 className="text-2xl font-bold">{selectedWorkflow.name}</h2>
                <p className="text-slate-300 text-sm mt-1">{selectedWorkflow.description}</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-5">
                  {(selectedWorkflow.formTemplate as any)?.fields && ((selectedWorkflow.formTemplate as any).fields as any[]).map((field: any) => (
                    <div key={field.name as string}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label as string} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea 
                          required={field.required as boolean}
                          onChange={e => handleFieldChange(field.name as string, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          rows={4}
                        />
                      ) : field.type === 'date' ? (
                        <input 
                          type="date"
                          required={field.required as boolean}
                          onChange={e => handleFieldChange(field.name as string, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      ) : (
                        <input 
                          type={field.type === 'number' ? 'number' : 'text'}
                          required={field.required as boolean}
                          onChange={e => handleFieldChange(field.name as string, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setSelectedWorkflow(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 font-medium rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "my-requests" && !selectedWorkflow && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {myRequests.length === 0 ? (
                <div className="p-10 text-center text-slate-500 flex flex-col items-center">
                  <Activity className="w-12 h-12 text-slate-200 mb-3" />
                  <p>You haven't submitted any workflow requests yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myRequests.map((req: any) => (
                    <div key={req._id as string} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-slate-800 text-lg">{(req.workflowDef as any)?.name as string || "Workflow"}</h4>
                          {renderStatusBadge(req.status as string)}
                        </div>
                        <p className="text-sm text-slate-500">Submitted on {new Date(req.createdAt as string).toLocaleDateString()}</p>
                      </div>
                      <div className="bg-slate-100 px-4 py-3 rounded-lg border border-slate-200 min-w-[200px]">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Stage</p>
                        <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                          {req.currentStep ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                              {(req.currentStep as any).name as string} (Pending)
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                              Workflow Completed
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
