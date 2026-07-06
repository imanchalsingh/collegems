import { useEffect, useState } from "react";
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
  Eye,
  CheckCircle,
  Download,
} from "lucide-react";
import api from "../api/axios";
import AssignmentComments from "../common-components-management/AssignmentComments";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchTeacherAssignments,
  createAssignment,
  evaluateAssignment,
  clearError
} from "../store/slices/assignmentSlice";

export default function TeacherAssignments({ courseId }: { courseId: string }) {
  const dispatch = useAppDispatch();
  const { teacherAssignments, loadingTeacher, loadingAction, error } = useAppSelector((state) => state.assignments);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [submissionType, setSubmissionType] = useState("file");
  const [localError, setLocalError] = useState<string | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<any | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [editedMarks, setEditedMarks] = useState<Record<string, string>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);
  const hasCourseId = Boolean(courseId);

  const assignments = courseId
    ? teacherAssignments.filter((assignment) => {
        if (!assignment.course) return false;
        return assignment.course?._id === courseId || assignment.course === courseId;
      })
    : teacherAssignments;

  useEffect(() => {
    dispatch(fetchTeacherAssignments());
  }, [courseId, dispatch]);

  const handleCreateAssignment = async () => {
    if (!hasCourseId) {
      setLocalError("Select a course before creating an assignment.");
      return;
    }
    if (!title || !dueDate) {
      setLocalError("Please fill in all required fields");
      return;
    }

    if (loadingAction) return;

    setLocalError(null);
    dispatch(clearError());

    try {
      const resultAction = await dispatch(createAssignment({
        title,
        description,
        courseId,
        dueDate,
        maxMarks: maxMarks || undefined,
        submissionType,
      })).unwrap();

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
      setLocalError(err || "Error creating assignment");
    }
  };

  const fetchSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    setViewingSubmissions({ _id: assignmentId, loading: true });
    
    try {
      const resultAction = await dispatch(fetchTeacherAssignments()).unwrap();
      const items = Array.isArray(resultAction) ? resultAction : [];
      
      const assignmentData = items.find((a: any) => a._id === assignmentId);
      
      if (!assignmentData) {
        throw new Error("Assignment not found in database");
      }

      const submissionsList = assignmentData.submissions || [];
      
      setViewingSubmissions({
        ...assignmentData,
        submissions: submissionsList
      });

      const marksObj: Record<string, string> = {};
      submissionsList.forEach((sub: any) => {
        if (sub.marks !== undefined && sub.student && sub.student._id) {
          marksObj[sub.student._id] = String(sub.marks);
        }
      });
      
      setEditedMarks(marksObj);
    } catch (err: any) {
      console.error(err);
      alert("Failed to load submissions");
      setViewingSubmissions(null);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async (studentId: string, assignmentId: string) => {
    const marks = editedMarks[studentId];
    if (marks === undefined || marks === "") return;
    setGradingId(studentId);
    try {
      await dispatch(evaluateAssignment({ assignmentId, studentId, marks: Number(marks) })).unwrap();
      const successMessage = document.createElement("div");
      successMessage.className =
        "fixed top-4 right-4 bg-green-50 text-green-800 px-4 py-3 rounded-lg border border-green-200 shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-top-2";
      successMessage.innerHTML = `
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Grade saved successfully!
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);
      
      setViewingSubmissions((prev: any) => {
        if (!prev) return prev;
        const newSubmissions = prev.submissions.map((s: any) => 
          s.student._id === studentId ? { ...s, status: "graded", marks: Number(marks) } : s
        );
        return { ...prev, submissions: newSubmissions };
      });
    } catch (err: any) {
      alert(err || "Failed to save grade");
    } finally {
      setGradingId(null);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setMaxMarks("");
    setSubmissionType("file");
    setLocalError(null);
    dispatch(clearError());
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
      {loadingTeacher && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-500">
          Loading assignments...
        </div>
      )}
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Assignments</p>
              <p className="text-lg font-semibold text-gray-900">
                {assignments.length}
              </p>
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
              <p className="text-lg font-semibold text-gray-900">
                {
                  assignments.filter((assignment: any) => {
                    if (!assignment.dueDate) return false;
                    return new Date(assignment.dueDate) >= new Date();
                  }).length
                }
              </p>
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
              <p className="text-lg font-semibold text-gray-900">
                {(() => {
                  const marks = assignments
                    .flatMap((assignment: any) => assignment.submissions || [])
                    .map((submission: any) => submission.marks)
                    .filter((mark: any) => typeof mark === "number");
                  if (marks.length === 0) return "N/A";
                  const avg =
                    marks.reduce((sum: number, mark: number) => sum + mark, 0) /
                    marks.length;
                  return `${Math.round(avg)} pts`;
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Assignment Button */}
      <button
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
        onClick={() => {
          if (!hasCourseId) {
            setLocalError("Select a course before creating an assignment.");
            return;
          }
          setOpen(true);
        }}
        disabled={!hasCourseId}
      >
        <Plus className="w-4 h-4" />
        Add New Assignment
      </button>
      {!hasCourseId && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          No course found for this teacher yet. Please create or assign a course
          before adding assignments.
        </p>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => !loadingAction && setOpen(false)}
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
                  onClick={() => !loadingAction && setOpen(false)}
                  disabled={loadingAction}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Error Message */}
              {(localError || error) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{localError || error}</span>
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
                  disabled={loadingAction}
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
                  disabled={loadingAction}
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
                      disabled={loadingAction}
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
                      disabled={loadingAction}
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
                        disabled={loadingAction}
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
                <p className="text-sm font-medium text-gray-900">
                  {courseId || "Not available"}
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => !loadingAction && setOpen(false)}
                  disabled={loadingAction}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssignment}
                  disabled={loadingAction || !title || !dueDate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed min-w-35 justify-center"
                >
                  {loadingAction ? (
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
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <FileText className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No assignments yet</p>
              {hasCourseId && (
                <button
                  onClick={() => setOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Assignment
                </button>
              )}
            </div>
          ) : (
            [...assignments]
              .sort((a, b) => {
                const aTime = new Date(a.createdAt || a.dueDate || 0).getTime();
                const bTime = new Date(b.createdAt || b.dueDate || 0).getTime();
                return bTime - aTime;
              })
              .map((assignment) => {
                const dueDate = assignment.dueDate
                  ? new Date(assignment.dueDate)
                  : null;
                const isActive = dueDate ? dueDate >= new Date() : false;
                return (
                  <div
                    key={assignment._id || assignment.title}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {assignment.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {dueDate
                            ? `Due ${dueDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}`
                            : "No due date"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${
                          isActive
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {isActive ? "Active" : "Closed"}
                      </span>

                      <button 
                        onClick={() => fetchSubmissions(assignment._id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                        title="View Submissions"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* ========================================================================
        NEW UPDATED MODAL CODE: SPLIT LAYOUT WITH COMMENTS INTEGRATION 
        ======================================================================== 
      */}
      {(viewingSubmissions || loadingSubmissions) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setViewingSubmissions(null)}
          />

          {/* UPDATED: Changed to max-w-6xl and added md:flex-row to create two columns */}
          <div className="relative w-full max-w-6xl bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col md:flex-row max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {loadingSubmissions ? (
              <div className="p-12 text-center flex flex-col items-center justify-center w-full">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading submissions...</p>
              </div>
            ) : viewingSubmissions && !viewingSubmissions.loading && (
              <>
                {/* ---------- LEFT COLUMN: SUBMISSIONS LIST ---------- */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {viewingSubmissions.title} Submissions
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Total Submissions: {viewingSubmissions.submissions?.length || 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewingSubmissions(null)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Submissions List */}
                  <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                    {(!viewingSubmissions.submissions || viewingSubmissions.submissions.length === 0) ? (
                      <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No submissions yet for this assignment.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {viewingSubmissions.submissions.map((sub: any, idx: number) => (
                          <div key={idx} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-start justify-between flex-wrap gap-4">
                              <div className="flex items-center gap-4 min-w-[200px]">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold overflow-hidden">
                                  {sub.student?.avatarUrl || sub.student?.photo ? (
                                    <img src={sub.student.avatarUrl || sub.student.photo} alt={sub.student?.name} className="w-full h-full object-cover" />
                                  ) : sub.student?.name?.charAt(0).toUpperCase() || "S"}
                                </div>
                                <div>
                             <p className="font-semibold text-gray-900 flex items-center">
                         {sub.student?.name || "Unknown Student"}
                            </p>
                                  <p className="text-sm text-gray-500">{sub.student?.email || "No email"}</p>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end min-w-[150px]">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${sub.status === 'graded' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {sub.status === 'graded' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                  {sub.status === 'graded' ? 'Graded' : 'Submitted'}
                                </span>
                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(sub.submittedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(sub.textResponse || sub.link) && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Text / Link Submission</h4>
                                  {sub.textResponse && <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{sub.textResponse}</p>}
                                  {sub.link && (
                                    <a href={sub.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                      <Link2 className="w-4 h-4" /> View Link
                                    </a>
                                  )}
                                </div>
                              )}
                              
                              {sub.file && sub.file.url && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">File Submission</h4>
                                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded p-2">
                                    <Paperclip className="w-5 h-5 text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate" title={sub.file.originalName}>{sub.file.originalName || "Attachment"}</p>
                                      <p className="text-xs text-gray-500">{(sub.file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <a 
                                      href={
                                        sub.file.url.startsWith("http") 
                                          ? `${sub.file.url}?token=${localStorage.getItem("token")}` 
                                          : `http://localhost:5000${sub.file.url}?token=${localStorage.getItem("token")}`
                                      } 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Grading Section */}
                            <div className="mt-4 flex items-center justify-end gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">Marks:</label>
                                <input 
                                  type="number" 
                                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                                  placeholder={`/${viewingSubmissions.totalPoints || viewingSubmissions.maxMarks || 100}`} 
                                  value={editedMarks[sub.student?._id] || ""} 
                                  onChange={(e) => setEditedMarks({ ...editedMarks, [sub.student?._id]: e.target.value })}
                                  disabled={gradingId === sub.student?._id || sub.status === "draft"}
                                />
                              </div>
                              <button 
                                onClick={() => handleSaveGrade(sub.student?._id, viewingSubmissions._id)}
                                disabled={gradingId === sub.student?._id || !editedMarks[sub.student?._id] || sub.status === "draft"}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
                              >
                                {gradingId === sub.student?._id ? (
                                  <><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</>
                                ) : "Save Grade"}
                              </button> 
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ---------- RIGHT COLUMN: COMMENTS SECTION ---------- */}
                <div className="w-full md:w-[400px] bg-white overflow-y-auto p-6 flex flex-col">
                  <AssignmentComments 
                    assignmentId={viewingSubmissions._id} 
                    initialComments={viewingSubmissions.comments || []} 
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )} 
    </div>
  );
}