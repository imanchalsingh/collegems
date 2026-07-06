import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, FileText, User, ArrowRight, Loader2 } from "lucide-react";
import api from "../api/axios";

export default function WorkflowApprovals() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get("/workflows/pending-approvals");
      setApprovals(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "Approved" | "Rejected") => {
    if (!selectedInstance) return;
    if (action === "Rejected" && !comments.trim()) {
      alert("Please provide comments for rejection.");
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/workflows/process/${selectedInstance._id}`, {
        action,
        comments
      });
      alert(`Request ${action} successfully!`);
      setSelectedInstance(null);
      setComments("");
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || "Failed to process request.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pending Approvals</h2>
          <p className="text-slate-500 text-sm mt-1">Review and process workflow requests requiring your approval.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-3">
          {approvals.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
              <p>You're all caught up!</p>
              <p className="text-xs mt-1">No pending approvals at this time.</p>
            </div>
          ) : (
            approvals.map((req) => (
              <div 
                key={req._id}
                onClick={() => setSelectedInstance(req)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedInstance?._id === req._id ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-blue-300 shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pending Review
                  </span>
                  <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-semibold text-slate-800 line-clamp-1">{req.workflowDef?.name || "Workflow"}</h3>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{req.requester?.name || "Unknown User"}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="col-span-1 md:col-span-2">
          {selectedInstance ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedInstance.workflowDef?.name}</h2>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                      <User className="w-4 h-4" /> Requested by <strong>{selectedInstance.requester?.name}</strong> ({selectedInstance.requester?.email})
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Submitted on {new Date(selectedInstance.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" /> Request Details
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(selectedInstance.formData || {}).map(([key, val]) => (
                      <div key={key}>
                        <span className="block text-xs font-medium text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="block text-sm text-slate-800 font-medium">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Reviewer Comments</label>
                  <textarea 
                    rows={4}
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Enter approval/rejection notes..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Comments are required for rejections.</p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                <button 
                  onClick={() => handleAction("Rejected")}
                  disabled={processing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50 transition-colors"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
                <button 
                  onClick={() => handleAction("Approved")}
                  disabled={processing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors shadow-sm"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve Request
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 h-[600px] flex flex-col items-center justify-center text-slate-400 shadow-sm">
              <FileText className="w-16 h-16 text-slate-200 mb-4" />
              <p>Select a pending request to review details and approve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
