import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function Assignment() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, submitted, overdue
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/assignment/student");
      console.log("Assignments response:", res.data);
      setAssignments(res.data);
    } catch (err: any) {
      console.error("Assignment fetch error:", err);
      alert("Failed to load assignments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (assignmentId: string) => {
    if (submitting) return;

    setSubmitting(assignmentId);
    try {
      await api.post(`/assignment/submit/${assignmentId}`);
      alert("Assignment submitted successfully! ✅");

      // Update local state
      setAssignments((prev) =>
        prev.map((a) =>
          a._id === assignmentId
            ? {
                ...a,
                submissions: [
                  ...(a.submissions || []),
                  {
                    student: localStorage.getItem("userId"),
                    submittedAt: new Date().toISOString(),
                    status: "submitted",
                  },
                ],
              }
            : a,
        ),
      );
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Submission failed";
      alert(`Submission failed: ${errorMsg}`);
    } finally {
      setSubmitting(null);
    }
  };

  // Filter assignments based on selected filter
  const filteredAssignments = assignments.filter((a) => {
    const userId = localStorage.getItem("userId");
    const submitted = a.submissions?.some((s: any) => {
      if (!s.student || !userId) return false;
      return s.student.toString() === userId;
    });
    const now = new Date();
    const dueDate = new Date(a.dueDate);
    const isOverdue = dueDate < now && !submitted;

    switch (filter) {
      case "pending":
        return !submitted && !isOverdue;
      case "submitted":
        return submitted;
      case "overdue":
        return isOverdue;
      default:
        return true;
    }
  });

  // Sort assignments: overdue first, then pending, then submitted
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const userId = localStorage.getItem("userId");

    const aSubmitted = a.submissions?.some(
      (s: any) => s.student?.toString() === userId,
    );
    const bSubmitted = b.submissions?.some(
      (s: any) => s.student?.toString() === userId,
    );

    const aDue = new Date(a.dueDate);
    const bDue = new Date(b.dueDate);
    const now = new Date();

    const aOverdue = aDue < now && !aSubmitted;
    const bOverdue = bDue < now && !bSubmitted;

    // Overdue first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by due date (closest first)
    if (!aSubmitted && !bSubmitted) {
      return aDue.getTime() - bDue.getTime();
    }

    // Submitted last
    if (aSubmitted && !bSubmitted) return 1;
    if (!aSubmitted && bSubmitted) return -1;

    return 0;
  });

  // Calculate statistics
  const stats = {
    total: assignments.length,
    pending: assignments.filter((a) => {
      const userId = localStorage.getItem("userId");
      const submitted = a.submissions?.some(
        (s: any) => s.student?.toString() === userId,
      );
      const dueDate = new Date(a.dueDate);
      const now = new Date();
      return !submitted && dueDate > now;
    }).length,
    submitted: assignments.filter((a) => {
      const userId = localStorage.getItem("userId");
      return a.submissions?.some((s: any) => s.student?.toString() === userId);
    }).length,
    overdue: assignments.filter((a) => {
      const userId = localStorage.getItem("userId");
      const submitted = a.submissions?.some(
        (s: any) => s.student?.toString() === userId,
      );
      const dueDate = new Date(a.dueDate);
      const now = new Date();
      return !submitted && dueDate < now;
    }).length,
  };

  const getStatusColor = (assignment: any) => {
    const userId = localStorage.getItem("userId");
    const submitted = assignment.submissions?.some(
      (s: any) => s.student?.toString() === userId,
    );
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();

    if (submitted) return "bg-green-500/20 text-green-400";
    if (dueDate < now && !submitted) return "bg-red-500/20 text-red-400";

    // Calculate days remaining
    const daysRemaining = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysRemaining <= 1) return "bg-yellow-500/20 text-yellow-400";
    if (daysRemaining <= 3) return "bg-orange-500/20 text-orange-400";
    return "bg-blue-500/20 text-blue-400";
  };

  const getStatusText = (assignment: any) => {
    const userId = localStorage.getItem("userId");
    const submitted = assignment.submissions?.some(
      (s: any) => s.student?.toString() === userId,
    );
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();

    if (submitted) return "Submitted";
    if (dueDate < now && !submitted) return "Overdue";

    const daysRemaining = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysRemaining === 0) return "Due Today";
    if (daysRemaining === 1) return "Due Tomorrow";
    return `Due in ${daysRemaining} days`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-6 rounded-2xl"
          style={{ borderBottom: `3px solid #e6c235` }}
        >
          <h1 className="text-3xl font-bold mb-2">Assignment Dashboard</h1>
          <p className="text-gray-400">
            Manage and submit your course assignments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 mt-10">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Assignments</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#0a295e]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#0a295e]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-3xl font-bold mt-2">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#e6c235]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#e6c235]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Submitted</p>
                <p className="text-3xl font-bold mt-2">{stats.submitted}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#10b981]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Overdue</p>
                <p className="text-3xl font-bold mt-2">{stats.overdue}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#ef4444]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.698-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap justify-between items-center mb-6 p-4 bg-gray-800 rounded-xl">
          <div className="flex space-x-2 mb-4 md:mb-0">
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${filter === "all" ? "bg-[#bd2323] text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              onClick={() => setFilter("all")}
            >
              All ({stats.total})
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${filter === "pending" ? "bg-[#e6c235] text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              onClick={() => setFilter("pending")}
            >
              Pending ({stats.pending})
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${filter === "submitted" ? "bg-[#10b981] text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              onClick={() => setFilter("submitted")}
            >
              Submitted ({stats.submitted})
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${filter === "overdue" ? "bg-[#ef4444] text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              onClick={() => setFilter("overdue")}
            >
              Overdue ({stats.overdue})
            </button>
          </div>

          <button
            onClick={fetchAssignments}
            className="flex items-center px-4 py-2 bg-linear-to-r from-[#0a295e] to-[#bd2323] rounded-lg hover:opacity-90 transition-opacity"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Assignments List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#bd2323]"></div>
            <p className="mt-4 text-gray-400">Loading assignments...</p>
          </div>
        ) : sortedAssignments.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold">No assignments found</h3>
            <p className="mt-2 text-gray-400">
              {filter === "all"
                ? "You don't have any assignments yet."
                : `No ${filter} assignments found.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedAssignments.map((assignment) => {
              const userId = localStorage.getItem("userId");
              const submitted = assignment.submissions?.some(
                (s: any) => s.student?.toString() === userId,
              );

              return (
                <div
                  key={assignment._id}
                  className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors border border-gray-700"
                >
                  {/* Assignment Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          {assignment.course?.name || "N/A"}
                        </span>
                        <span className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Code: {assignment.course?.code || "N/A"}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment)}`}
                    >
                      {getStatusText(assignment)}
                    </span>
                  </div>

                  {/* Assignment Details */}
                  {assignment.description && (
                    <p className="text-gray-300 mb-4 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}

                  {/* Due Date and Points */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm">
                        <svg
                          className="w-4 h-4 mr-1 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-gray-300">Due:</span>
                        <span className="ml-1 font-medium">
                          {new Date(assignment.dueDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>

                      {assignment.totalPoints && (
                        <div className="flex items-center text-sm">
                          <svg
                            className="w-4 h-4 mr-1 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          <span className="text-gray-300">Points:</span>
                          <span className="ml-1 font-medium">
                            {assignment.totalPoints}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission Info */}
                  {submitted &&
                    assignment.submissions?.find(
                      (s: any) => s.student?.toString() === userId,
                    )?.submittedAt && (
                      <div className="mb-4 p-3 bg-green-500/10 rounded-lg">
                        <div className="flex items-center text-sm text-green-400">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Submitted on{" "}
                          {new Date(
                            assignment.submissions.find(
                              (s: any) => s.student?.toString() === userId,
                            )?.submittedAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    {assignment.instructionsFile && (
                      <a
                        href={assignment.instructionsFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        View Instructions
                      </a>
                    )}

                    {!submitted ? (
                      <button
                        onClick={() => handleSubmit(assignment._id)}
                        disabled={submitting === assignment._id}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${
                          submitting === assignment._id
                            ? "bg-gray-600 cursor-not-allowed"
                            : "bg-linear-to-r from-[#bd2323] to-[#0a295e] hover:opacity-90"
                        } flex items-center`}
                      >
                        {submitting === assignment._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          "Submit Assignment"
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center px-4 py-2 bg-green-500/20 rounded-lg">
                        <svg
                          className="w-5 h-5 mr-2 text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-green-400 font-medium">
                          Submitted
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
