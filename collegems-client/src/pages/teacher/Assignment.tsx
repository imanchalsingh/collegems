import { useState } from "react";
import {
  Plus,
  X,
  Calendar,
  FileText,
  Link2,
  Type,
  RefreshCw,
  Clock,
  Award,
  Paperclip,
  Save,
  AlertCircle,
} from "lucide-react";
import api from "../../api/axios";

export default function TeacherAssignments({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [submissionType, setSubmissionType] = useState("file");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAssignment = async () => {
    if (!title || !dueDate) {
      setError("Please fill in all required fields");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      await api.post("/assignment/create", {
        title,
        description,
        courseId,
        dueDate,
        maxMarks: maxMarks || undefined,
        submissionType,
      });

      // Show success message
      const successMessage = document.createElement("div");
      successMessage.className =
        "fixed top-4 right-4 bg-green-50 text-green-800 px-4 py-3 rounded-lg border border-green-200 shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-top-2";
      successMessage.innerHTML = `
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Assignment created successfully!
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

      resetForm();
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error creating assignment");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setMaxMarks("");
    setSubmissionType("file");
    setError(null);
  };

  const submissionTypes = [
    {
      value: "file",
      label: "File Upload",
      icon: Paperclip,
      description: "Students upload files",
    },
    {
      value: "text",
      label: "Text Input",
      icon: Type,
      description: "Students enter text",
    },
    {
      value: "link",
      label: "Link",
      icon: Link2,
      description: "Students submit URLs",
    },
    {
      value: "both",
      label: "Both",
      icon: FileText,
      description: "File + Text submission",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Assignments</p>
              <p className="text-lg font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-lg font-semibold text-gray-900">8</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg. Score</p>
              <p className="text-lg font-semibold text-gray-900">85%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Assignment Button */}
      <button
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" />
        Add New Assignment
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Create New Assignment
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Fill in the details to create a new assignment
                  </p>
                </div>
                <button
                  onClick={() => !loading && setOpen(false)}
                  disabled={loading}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assignment Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="e.g., Introduction to Programming"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                  placeholder="Provide detailed instructions for the assignment (optional)"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Due Date and Max Marks Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Maximum Marks
                  </label>
                  <div className="relative">
                    <Award
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="number"
                      className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="100"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                      disabled={loading}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Submission Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Submission Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {submissionTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = submissionType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSubmissionType(type.value)}
                        disabled={loading}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg border transition-all text-left
                          ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <div
                          className={`p-1.5 rounded-lg ${isSelected ? "bg-blue-100" : "bg-gray-100"}`}
                        >
                          <Icon
                            className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-gray-500"}`}
                          />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-gray-700"}`}
                          >
                            {type.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {type.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Course Info */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Course ID</p>
                <p className="text-sm font-medium text-gray-900">{courseId}</p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => !loading && setOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createAssignment}
                  disabled={loading || !title || !dueDate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed min-w-35 justify-center"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Assignments Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Assignments</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Assignment {i + 1}
                  </p>
                  <p className="text-xs text-gray-500">Due in {i + 2} days</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
