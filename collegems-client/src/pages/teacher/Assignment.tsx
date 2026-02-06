import { useState } from "react";
import api from "../../api/axios";

export default function TeacherAssignments({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [submissionType, setSubmissionType] = useState("file");
  const [loading, setLoading] = useState(false);

  const createAssignment = async () => {
    if (!title || !dueDate) {
      alert("Please fill in all required fields");
      return;
    }

    if (loading) return;
    
    setLoading(true);
    try {
      await api.post("/assignment/create", {
        title,
        description,
        courseId,
        dueDate,
        maxMarks: maxMarks || undefined,
        submissionType
      });

      alert("Assignment created successfully ✅");
      resetForm();
      setOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Error creating assignment");
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
  };

  return (
    <div className="mt-6">
      {/* Add Assignment Button */}
      <button
        className="group flex items-center gap-2 px-6 py-3 bg-linear-to-r from-[#0a295e] to-[#bd2323] text-white rounded-xl hover:shadow-lg hover:shadow-[#bd2323]/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] font-medium"
        onClick={() => setOpen(true)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add New Assignment
      </button>
      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div 
              className="p-6"
              style={{
                background: "linear-linear(135deg, #0a295e 0%, rgba(189, 35, 35, 0.2) 100%)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Create New Assignment</h3>
                  <p className="text-gray-300 text-sm mt-1">Add assignment details for students</p>
                </div>
                <button
                  onClick={() => !loading && setOpen(false)}
                  disabled={loading}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Assignment Title *
                </label>
                <input
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                  placeholder="Enter assignment title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all resize-none"
                  placeholder="Enter assignment description (optional)"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Due Date and Max Marks Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Due Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all appearance-none"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      disabled={loading}
                    />
                    <svg className="absolute right-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Max Marks
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                      placeholder="e.g., 100"
                      value={maxMarks}
                      onChange={e => setMaxMarks(e.target.value)}
                      disabled={loading}
                    />
                    <span className="absolute right-3 top-3 text-gray-400">points</span>
                  </div>
                </div>
              </div>

              {/* Submission Type */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Submission Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "file", label: "File Upload", icon: "📎" },
                    { value: "text", label: "Text Input", icon: "📝" },
                    { value: "link", label: "Link", icon: "🔗" },
                    { value: "both", label: "Both", icon: "🔄" }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSubmissionType(type.value)}
                      disabled={loading}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        submissionType === type.value
                          ? "bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white shadow-lg"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      } disabled:opacity-50`}
                    >
                      <span className="mr-2">{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Course ID Display */}
              <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <p className="text-sm text-gray-400">Course ID</p>
                <p className="text-white font-medium">{courseId}</p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 bg-gray-850 border-t border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => !loading && setOpen(false)}
                  disabled={loading}
                  className="px-5 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createAssignment}
                  disabled={loading || !title || !dueDate}
                  className="px-5 py-2 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white rounded-lg hover:shadow-lg hover:shadow-[#bd2323]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-25 justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}