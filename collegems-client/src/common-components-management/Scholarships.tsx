import { useEffect, useState } from "react";
import {
  Award,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  AlertCircle,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface ScholarshipApp {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
    studentId?: string;
    course?: string;
    semester?: string;
  };
  scholarshipName: string;
  amount: number;
  academicYear: string;
  category: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  adminRemarks?: string;
  reviewedBy?: {
    name: string;
    email: string;
  };
  reviewedAt?: string;
  createdAt: string;
}

export default function Scholarships() {
  const [role, setRole] = useState<string>("");
  const [applications, setApplications] = useState<ScholarshipApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState({
    scholarshipName: "",
    amount: "",
    academicYear: "2026-2027",
    category: "Merit",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Review states (HOD)
  const [selectedApp, setSelectedApp] = useState<ScholarshipApp | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Search & Filter (HOD)
  const [filterTab, setFilterTab] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const cachedRole = localStorage.getItem("role") || "";
    setRole(cachedRole);
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const cachedRole = localStorage.getItem("role") || "";
      const endpoint = cachedRole === "hod" ? "/scholarships/all" : "/scholarships/me";
      const res = await api.get(endpoint);
      setApplications(extractArray(res.data));
    } catch (err: any) {
      console.error("Fetch scholarships error:", err);
      setError(err.response?.data?.message || "Failed to load scholarship applications.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scholarshipName || !formData.amount || !formData.reason) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/scholarships", {
        ...formData,
        amount: Number(formData.amount),
      });
      setShowApplyModal(false);
      setFormData({
        scholarshipName: "",
        amount: "",
        academicYear: "2026-2027",
        category: "Merit",
        reason: "",
      });
      fetchApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to withdraw this application?")) return;
    try {
      await api.delete(`/scholarships/${id}`);
      fetchApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to withdraw application.");
    }
  };

  const handleReview = async (status: "Approved" | "Rejected") => {
    if (!selectedApp) return;
    try {
      setReviewing(true);
      await api.patch(`/scholarships/${selectedApp._id}/review`, {
        status,
        adminRemarks,
      });
      setShowReviewModal(false);
      setSelectedApp(null);
      setAdminRemarks("");
      fetchApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to review application.");
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-150 dark:border-green-900/40 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-150 dark:border-red-900/40 rounded-full">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-150 dark:border-blue-900/40 rounded-full">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  // Filter HOD applications
  const filteredApps = applications.filter((app) => {
    const matchesTab = filterTab === "All" || app.status === filterTab;
    const studentInfo = app.studentId || {};
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      app.scholarshipName.toLowerCase().includes(query) ||
      (studentInfo.name || "").toLowerCase().includes(query) ||
      (studentInfo.studentId || "").toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Upper header action area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-600" />
            {role === "hod" ? "Scholarship Approvals" : "Scholarship Applications"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {role === "hod"
              ? "Review and process submitted student scholarship applications."
              : role === "parent"
              ? "Track your child's active scholarship application statuses."
              : "Apply for financial aids, grants, and track your active applications."}
          </p>
        </div>

        {role === "student" && (
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Apply Now
          </button>
        )}
      </div>

      {/* Main content view */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading applications...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4 rounded-xl text-center text-red-600 dark:text-red-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* HOD View Controls */}
          {role === "hod" && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex gap-2">
                {(["All", "Pending", "Approved", "Rejected"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      filterTab === tab
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name, ID or scholarship..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Empty state */}
          {(role === "hod" ? filteredApps : applications).length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
              <Award className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Applications Found</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
                {role === "hod"
                  ? "There are no student scholarship applications matching the selection criteria."
                  : "You haven't submitted any scholarship applications yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(role === "hod" ? filteredApps : applications).map((app) => (
                <div
                  key={app._id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between hover:shadow-lg transition-all"
                >
                  <div className="space-y-4">
                    {/* Header line */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/30 px-2 py-0.5 rounded-md">
                          {app.category}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                          {app.scholarshipName}
                        </h3>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>

                    {/* Student Info (HOD only) */}
                    {role === "hod" && app.studentId && (
                      <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded-lg text-sm border border-gray-100 dark:border-gray-800">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Student: {app.studentId.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ID: {app.studentId.studentId || "N/A"} • Dept: {app.studentId.course || "N/A"} (Sem {app.studentId.semester || "N/A"})
                        </p>
                        <p className="text-xs text-gray-500">{app.studentId.email}</p>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ₹{app.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Academic Year</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {app.academicYear}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Reason/Statement of Need</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-950 p-3 rounded-lg italic border border-gray-100 dark:border-gray-800 max-h-24 overflow-y-auto">
                        "{app.reason}"
                      </p>
                    </div>

                    {/* Admin remarks */}
                    {app.status !== "Pending" && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-sm space-y-1">
                        <p className="text-xs text-gray-500">
                          Reviewed by {app.reviewedBy?.name || "Administrator"} on{" "}
                          {app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : ""}
                        </p>
                        {app.adminRemarks && (
                          <p className="text-gray-700 dark:text-gray-300 font-medium bg-purple-50/40 dark:bg-purple-950/10 p-2.5 rounded-lg border border-purple-100/30">
                            <strong>Remarks:</strong> {app.adminRemarks}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex justify-end gap-2">
                    {role === "student" && app.status === "Pending" && (
                      <button
                        onClick={() => handleCancel(app._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 rounded-lg transition-colors border border-red-150 dark:border-red-900/30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Withdraw
                      </button>
                    )}

                    {role === "hod" && app.status === "Pending" && (
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setShowReviewModal(true);
                        }}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors cursor-pointer"
                      >
                        Process Application
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- MODALS --- */}

      {/* 1. Student Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Apply for Scholarship
              </h3>
              <p className="text-sm text-gray-500">Provide scholarship details and reason for applying.</p>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Scholarship Name *
                </label>
                <input
                  type="text"
                  name="scholarshipName"
                  value={formData.scholarshipName}
                  onChange={handleInputChange}
                  placeholder="e.g. Merit-cum-Means Scholarship"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Merit">Merit</option>
                    <option value="Need-based">Need-based</option>
                    <option value="Sports">Sports</option>
                    <option value="Special Category">Special Category</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Statement of Need / Reason *
                </label>
                <textarea
                  name="reason"
                  rows={4}
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Explain why you deserve this scholarship or your financial need details..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. HOD Review Modal */}
      {showReviewModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Review Scholarship Application
              </h3>
              <p className="text-sm text-gray-500">
                Process request for {selectedApp.studentId?.name || "Student"}.
              </p>
            </div>

            <div className="space-y-3 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-sm">
              <p>
                <strong>Scholarship:</strong> {selectedApp.scholarshipName}
              </p>
              <p>
                <strong>Amount Requested:</strong> ₹{selectedApp.amount.toLocaleString()}
              </p>
              <p>
                <strong>Student Reason:</strong> "{selectedApp.reason}"
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Reviewer Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Enter remarks or approval reason..."
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedApp(null);
                  setAdminRemarks("");
                }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReview("Rejected")}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReview("Approved")}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
