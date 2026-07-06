import React, { useEffect, useState } from "react";
import {
  FileText, CheckCircle, AlertCircle, Clock, Calendar,
  ArrowRight, RefreshCw, X, Send, Trash2, MessageSquare,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { scrollToFirstError } from "../utils/formHelpers";
import useFormTracker from "../hooks/useFormTracker";

interface LeaveData {
  _id: string;
  subject: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: string;
  status: "Pending" | "Approved" | "Rejected";
  adminRemarks?: string;
  reviewedBy?: { name: string; email: string };
  reviewedAt?: string;
  createdAt: string;
}

const LeaveRequest: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { trackField, markSubmitted } = useFormTracker({ formId: "leave_request" });

  // Form state
  const [subject, setSubject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaveType, setLeaveType] = useState("Casual");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Filter
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { fetchLeaves(); }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get("/leaves/me");
      setLeaves(extractArray(res.data));
    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!subject.trim()) newErrors.subject = "Subject is required";
    if (!startDate) newErrors.startDate = "Start date is required";
    if (!endDate) newErrors.endDate = "End date is required";
    if (startDate && endDate && new Date(endDate) < new Date(startDate))
      newErrors.endDate = "End date must be on or after start date";
    if (!reason.trim()) newErrors.reason = "Reason is required";
    else if (reason.trim().length < 10) newErrors.reason = "Please provide at least 10 characters";
    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors);
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/leaves", {
        subject: subject.trim(),
        startDate, endDate,
        reason: reason.trim(),
        type: leaveType,
      });
      setSubmitSuccess(true);
      markSubmitted();
      setSubject(""); setStartDate(""); setEndDate(""); setReason(""); setLeaveType("Casual");
      setShowForm(false);
      fetchLeaves();
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (id: string) => {
    if (!confirm("Withdraw this leave request?")) return;
    try {
      await api.delete(`/leaves/${id}`);
      fetchLeaves();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to withdraw");
    }
  };

  const getDaysCount = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved": return <CheckCircle className="w-3.5 h-3.5" />;
      case "Rejected": return <X className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Sick": return "bg-red-100 text-red-700";
      case "Duty": return "bg-blue-100 text-blue-700";
      case "Other": return "bg-gray-100 text-gray-700";
      default: return "bg-violet-100 text-violet-700";
    }
  };

  const filteredLeaves = filter === "all" ? leaves : leaves.filter(l => l.status === filter);
  const counts = {
    all: leaves.length,
    Pending: leaves.filter(l => l.status === "Pending").length,
    Approved: leaves.filter(l => l.status === "Approved").length,
    Rejected: leaves.filter(l => l.status === "Rejected").length,
  };

  return (
    <div className="space-y-8 p-1 sm:p-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Send className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Leave Requests
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl">
              Submit leave applications and track their approval status. Faculty will review your requests.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><ArrowRight className="w-4 h-4" /> New Request</>}
          </button>
        </div>
      </div>

      {/* Success / Error */}
      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Leave request submitted!</p>
            <p className="text-xs text-emerald-700 mt-1">You'll be notified when a faculty member reviews it.</p>
          </div>
        </div>
      )}
      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Submission Failed</p>
            <p className="text-xs text-rose-700 mt-1">{submitError}</p>
          </div>
        </div>
      )}

      {/* New Leave Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Submit Leave Application
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject */}
            <div>
              <label htmlFor="leave-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
              <input id="leave-subject" type="text" name="subject" value={subject} onChange={e => { setSubject(e.target.value); if (errors.subject) setErrors(p => ({...p, subject: ""})); }}
                onBlur={() => trackField("subject", 5)}
                placeholder="e.g. Family event leave" className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${errors.subject ? "border-red-400" : "border-gray-300"}`} />
              {errors.subject && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.subject}</p>}
            </div>

            {/* Leave Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Leave Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["Sick", "Casual", "Duty", "Other"].map(type => (
                  <button key={type} type="button" onClick={() => { setLeaveType(type); trackField("leaveType", 5); }}
                    className={`px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${leaveType === type ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="leave-start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" /> Start Date
                </label>
                <input id="leave-start-date" type="date" name="startDate" value={startDate} onChange={e => { setStartDate(e.target.value); if (errors.startDate) setErrors(p => ({...p, startDate: ""})); }}
                  onBlur={() => trackField("startDate", 5)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${errors.startDate ? "border-red-400" : "border-gray-300"}`} />
                {errors.startDate && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.startDate}</p>}
              </div>
              <div>
                <label htmlFor="leave-end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" /> End Date
                </label>
                <input id="leave-end-date" type="date" name="endDate" value={endDate} min={startDate} onChange={e => { setEndDate(e.target.value); if (errors.endDate) setErrors(p => ({...p, endDate: ""})); }}
                  onBlur={() => trackField("endDate", 5)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${errors.endDate ? "border-red-400" : "border-gray-300"}`} />
                {errors.endDate && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.endDate}</p>}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="leave-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason</label>
              <textarea id="leave-reason" rows={4} name="reason" value={reason} onChange={e => { setReason(e.target.value); if (errors.reason) setErrors(p => ({...p, reason: ""})); }}
                onBlur={() => trackField("reason", 5)}
                placeholder="Describe the reason for your leave..."
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none ${errors.reason ? "border-red-400" : "border-gray-300"}`} />
              {errors.reason && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.reason}</p>}
            </div>

            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/10">
              {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Request</>}
            </button>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "Pending", "Approved", "Rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
            {f === "all" ? "All" : f}
            <span className="ml-1.5 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}
        <button onClick={fetchLeaves} className="ml-auto p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Leave List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500 mt-3">Loading leave requests...</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 dark:text-white">No leave requests found</p>
          <p className="text-sm text-gray-500 mt-1">Click "New Request" to submit a leave application.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredLeaves.map(leave => (
            <div key={leave._id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{leave.subject}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyles(leave.status)}`}>
                      {getStatusIcon(leave.status)} {leave.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${getTypeColor(leave.type)}`}>{leave.type}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-medium text-gray-400">
                      ({getDaysCount(leave.startDate, leave.endDate)} day{getDaysCount(leave.startDate, leave.endDate) > 1 ? "s" : ""})
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{leave.reason}</p>
                  {leave.adminRemarks && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1">
                        <MessageSquare className="w-3 h-3" /> Faculty Remarks
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{leave.adminRemarks}</p>
                      {leave.reviewedBy && (
                        <p className="text-[10px] text-gray-400 mt-1">— {leave.reviewedBy.name}</p>
                      )}
                    </div>
                  )}
                </div>
                {leave.status === "Pending" && (
                  <button onClick={() => handleWithdraw(leave._id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shrink-0">
                    <Trash2 className="w-3 h-3" /> Withdraw
                  </button>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                <span>Ref: #{leave._id.slice(-8).toUpperCase()}</span>
                <span>Submitted: {new Date(leave.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveRequest;
