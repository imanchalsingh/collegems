import React, { useEffect, useState } from "react";
import {
  FileText, CheckCircle2, XCircle, Search, Filter, RefreshCw, Trash2,
  AlertCircle, Check, X, GraduationCap, ArrowUpDown
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";


interface SubmittedForm {
  _id: string;
  studentName: string;
  rollNumber: string;
  courseDept: string;
  semesterYear: string;
  subjects: string[];
  examType: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

const HODExamForms: React.FC = () => {
  const [forms, setForms] = useState<SubmittedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Notifications
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/exam-forms");
      setForms(extractArray(res.data));
    } catch (err) {
      console.error("Error fetching exam forms for HOD:", err);
      setErrorMsg("Failed to load examination forms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "Approved" | "Rejected" | "Pending") => {
    try {
      setActioningId(id);
      setSuccessMsg("");
      setErrorMsg("");

      const res = await api.put(`/exam-forms/${id}/status`, { status });
      
      // Update locally
      setForms(forms.map(form => form._id === id ? { ...form, status } : form));
      setSuccessMsg(res.data.message || `Form updated to ${status} successfully!`);
      
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error updating exam form status:", err);
      setErrorMsg(err.response?.data?.message || "Failed to update form status.");
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this examination form submission?")) return;

    try {
      setActioningId(id);
      setSuccessMsg("");
      setErrorMsg("");

      const res = await api.delete(`/exam-forms/${id}`);
      
      setForms(forms.filter(form => form._id !== id));
      setSuccessMsg(res.data.message || "Examination form deleted successfully.");
      
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error deleting exam form:", err);
      setErrorMsg(err.response?.data?.message || "Failed to delete exam form.");
    } finally {
      setActioningId(null);
    }
  };

  // Filter and Search logic
  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      form.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.courseDept.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || form.status === statusFilter;
    const matchesType = typeFilter === "All" || form.examType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  // Calculate statistics
  const stats = {
    total: forms.length,
    pending: forms.filter(f => f.status === "Pending").length,
    approved: forms.filter(f => f.status === "Approved").length,
    rejected: forms.filter(f => f.status === "Rejected").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800";
      default:
        return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: stats.total, color: "blue", icon: FileText, bg: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
          { label: "Pending Review", value: stats.pending, color: "amber", icon: RefreshCw, bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
          { label: "Approved Forms", value: stats.approved, color: "emerald", icon: CheckCircle2, bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
          { label: "Rejected Forms", value: stats.rejected, color: "rose", icon: XCircle, bg: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, roll #..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Exam Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Exam Types</option>
            <option value="Regular">Regular</option>
            <option value="Backlog">Backlog</option>
            <option value="Improvement">Improvement</option>
            <option value="Re-evaluation">Re-evaluation</option>
          </select>

          {/* Sort */}
          <button
            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
            className="p-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 text-xs font-medium"
            title="Sort by Date"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Date {sortOrder === "desc" ? "Newest" : "Oldest"}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchForms}
            className="p-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Submissions Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-gray-500 mt-3">Loading examination submissions...</p>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="py-20 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No submissions found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              No examination forms match your search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Student Details</th>
                  <th className="px-6 py-4">Course & Sem</th>
                  <th className="px-6 py-4">Subjects Selected</th>
                  <th className="px-6 py-4">Exam Type</th>
                  <th className="px-6 py-4">Date Submitted</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {filteredForms.map((form) => (
                  <tr key={form._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    
                    {/* Student Details */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{form.studentName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">ID: {form.rollNumber}</p>
                      </div>
                    </td>

                    {/* Course & Sem */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-800 dark:text-gray-300 font-medium">{form.courseDept}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{form.semesterYear}</p>
                      </div>
                    </td>

                    {/* Subjects */}
                    <td className="px-6 py-4">
                      <div className="max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {form.subjects.map((sub, i) => (
                            <span
                              key={i}
                              className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-400 font-medium max-w-full truncate"
                              title={sub}
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Exam Type */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-semibold">
                        {form.examType}
                      </span>
                    </td>

                    {/* Date Submitted */}
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(form.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(form.status)}`}>
                        {form.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {form.status === "Pending" ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(form._id, "Approved")}
                              disabled={actioningId === form._id}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-400 rounded-lg transition-colors"
                              title="Approve Submission"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(form._id, "Rejected")}
                              disabled={actioningId === form._id}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-400 rounded-lg transition-colors"
                              title="Reject Submission"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(form._id, "Pending")}
                            disabled={actioningId === form._id}
                            className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400 rounded-lg transition-colors"
                            title="Reset to Pending"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(form._id)}
                          disabled={actioningId === form._id}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 dark:bg-gray-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 rounded-lg transition-colors"
                          title="Delete Form"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default HODExamForms;
