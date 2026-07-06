import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw, Search,
  FileText, FileType, Link as LinkIcon, X, ChevronRight,
  CheckCircle, Eye, Sliders, BookOpen,
} from "lucide-react";
import api from "../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssignmentOption {
  _id: string;
  title: string;
  course?: { _id: string; name: string; code: string };
  dueDate: string;
  submissions?: any[];
}

interface MatchedSection {
  excerpt: string;
  similarity: number;
}

interface ReportMatch {
  matchType: "same_assignment" | "previous_year";
  sourceAssignment?: { _id: string; title: string } | string;
  sourceAssignmentTitle: string;
  matchedStudent?: { _id: string; name: string } | string;
  matchedStudentName: string;
  academicYear: string;
  similarityPercentage: number;
  matchedSections: MatchedSection[];
}

interface Report {
  _id: string;
  assignment: string;
  student: { _id: string; name: string; email: string; studentId?: string };
  sourceType: "file" | "text" | "link" | "none";
  extractedCharacterCount: number;
  extractionNote?: string;
  overallSimilarity: number;
  threshold: number;
  flagged: boolean;
  matches: ReportMatch[];
  status: "pending_review" | "reviewed" | "cleared" | "action_taken";
  reviewNotes?: string;
  reviewedBy?: { name: string };
  reviewedAt?: string;
  checkedAt: string;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

const sourceIcon = (type: Report["sourceType"]) => {
  switch (type) {
    case "file":
      return <FileType className="w-4 h-4 text-gray-400" />;
    case "text":
      return <FileText className="w-4 h-4 text-gray-400" />;
    case "link":
      return <LinkIcon className="w-4 h-4 text-gray-400" />;
    default:
      return <FileText className="w-4 h-4 text-gray-300" />;
  }
};

const similarityColor = (pct: number) => {
  if (pct >= 70) return "text-red-600 dark:text-red-400";
  if (pct >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
};

const similarityBarColor = (pct: number) => {
  if (pct >= 70) return "bg-red-500";
  if (pct >= 40) return "bg-amber-400";
  return "bg-emerald-500";
};

const statusBadge = (status: Report["status"]) => {
  switch (status) {
    case "reviewed":
      return "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
    case "cleared":
      return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    case "action_taken":
      return "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
    default:
      return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
  }
};

const statusLabel: Record<Report["status"], string> = {
  pending_review: "Pending Review",
  reviewed: "Reviewed",
  cleared: "Cleared",
  action_taken: "Action Taken",
};

export default function PlagiarismChecker() {
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [threshold, setThreshold] = useState(40);
  const [reports, setReports] = useState<Report[]>([]);
  const [assignmentMeta, setAssignmentMeta] = useState<{ title: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [checkSummary, setCheckSummary] = useState<{
    totalSubmissions: number;
    flaggedCount: number;
    comparedAgainstPriorYears: number;
  } | null>(null);

  // ─── Load assignments for dropdown ─────────────────────────────────────────
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await api.get("/assignment/student"); // returns all assignments
        const data = res.data;
        // Normalize: API may return a bare array, or an object wrapping it
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.assignments)
          ? data.assignments
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setAssignments(list);
        if (list.length === 0) {
          setError("No assignments found, or the response format was unexpected.");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load assignments");
      }
    };
    fetchAssignments();
  }, []);

  // ─── Load existing reports when an assignment is selected ─────────────────
  const fetchReports = async (assignmentId: string) => {
    if (!assignmentId) return;
    setLoadingReports(true);
    setError("");
    try {
      const res = await api.get(`/plagiarism/assignment/${assignmentId}`);
      setReports(res.data.reports || []);
      setAssignmentMeta(res.data.assignment || null);
    } catch (err: any) {
      // 404-ish: no reports yet is fine, just show empty state
      setReports([]);
      if (err?.response?.status && err.response.status !== 404) {
        setError(err.response?.data?.message || "Failed to load reports");
      }
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (selectedAssignment) {
      setCheckSummary(null);
      fetchReports(selectedAssignment);
    } else {
      setReports([]);
      setAssignmentMeta(null);
    }
  }, [selectedAssignment]);

  // ─── Run the plagiarism check ────────────────────────────────────────────
  const runCheck = async () => {
    if (!selectedAssignment) return;
    setChecking(true);
    setError("");
    try {
      const res = await api.post(`/plagiarism/check/${selectedAssignment}`, { threshold });
      setReports(res.data.reports || []);
      setAssignmentMeta({ title: res.data.assignmentTitle });
      setCheckSummary({
        totalSubmissions: res.data.totalSubmissions,
        flaggedCount: res.data.flaggedCount,
        comparedAgainstPriorYears: res.data.comparedAgainstPriorYears,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to run plagiarism check");
    } finally {
      setChecking(false);
    }
  };

  // ─── Review modal actions ──────────────────────────────────────────────────
  const openReport = (report: Report) => {
    setSelectedReport(report);
    setReviewNotes(report.reviewNotes || "");
  };

  const submitReview = async (status: "reviewed" | "cleared" | "action_taken") => {
    if (!selectedReport) return;
    setReviewSubmitting(true);
    try {
      const res = await api.patch(`/plagiarism/report/${selectedReport._id}/review`, {
        status,
        reviewNotes,
      });
      setReports((curr) =>
        curr.map((r) => (r._id === selectedReport._id ? { ...r, ...res.data } : r))
      );
      setSelectedReport((curr) => (curr ? { ...curr, ...res.data } : curr));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update report");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────
  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.student.name.toLowerCase().includes(q) ||
        r.student.email?.toLowerCase().includes(q) ||
        r.student.studentId?.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const flaggedCount = reports.filter((r) => r.flagged).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Plagiarism Checker
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compare submissions for similarity against classmates and previous years
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-3">
          <div>
            <label htmlFor="plagiarism-assignment" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assignment
            </label>
            <select
              id="plagiarism-assignment"
              className={inputCls}
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
            >
              <option value="">Select an assignment…</option>
              {assignments.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.title} {a.course ? `(${a.course.code})` : ""} — {a.submissions?.length || 0} submission{a.submissions?.length === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="plagiarism-threshold" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Flag Threshold (%)
            </label>
            <div className="relative">
              <Sliders className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                id="plagiarism-threshold"
                type="number"
                min={10}
                max={100}
                className={`${inputCls} pl-9`}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={runCheck}
              disabled={!selectedAssignment || checking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {checking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Run Check
                </>
              )}
            </button>
          </div>
        </div>

        {checkSummary && (
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
              {checkSummary.totalSubmissions} submission{checkSummary.totalSubmissions === 1 ? "" : "s"} checked
            </span>
            <span className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Compared against {checkSummary.comparedAgainstPriorYears} prior-year assignment{checkSummary.comparedAgainstPriorYears === 1 ? "" : "s"}
            </span>
            <span className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${checkSummary.flaggedCount > 0 ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {checkSummary.flaggedCount} flagged
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {!selectedAssignment ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Select an assignment to view or run a plagiarism check</p>
        </div>
      ) : loadingReports ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading reports…</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-900 dark:text-white font-medium mb-1">No plagiarism check run yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {assignmentMeta?.title ? `Run a check for "${assignmentMeta.title}" to see results here.` : "Click \"Run Check\" to analyze submissions."}
          </p>
        </div>
      ) : (
        <>
          {/* Summary + search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {flaggedCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-medium">
                  <AlertTriangle className="w-4 h-4" /> {flaggedCount} submission{flaggedCount === 1 ? "" : "s"} flagged
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium">
                  <CheckCircle className="w-4 h-4" /> No flagged submissions
                </span>
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by student…"
                className={`${inputCls} pl-9`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    {["Student", "Source", "Similarity", "Top Match", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredReports.map((r) => {
                    const topMatch = r.matches[0];
                    return (
                      <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              {r.student.name}
                              {r.flagged && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{r.student.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 capitalize">
                            {sourceIcon(r.sourceType)} {r.sourceType}
                            {r.extractionNote && (
                              <AlertTriangle
                                className="w-3.5 h-3.5 text-amber-500"
                                aria-label="Extraction quality warning"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${similarityColor(r.overallSimilarity)}`}>
                              {r.overallSimilarity}%
                            </span>
                            <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${similarityBarColor(r.overallSimilarity)}`}
                                style={{ width: `${r.overallSimilarity}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {topMatch ? (
                            <div className="text-xs">
                              <p className="font-medium text-gray-900 dark:text-white">{topMatch.matchedStudentName}</p>
                              <p className="text-gray-500 dark:text-gray-400">
                                {topMatch.matchType === "previous_year" ? `Prior year (${topMatch.academicYear})` : "Same assignment"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No significant matches</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusBadge(r.status)}`}>
                            {statusLabel[r.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openReport(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedReport(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600">
              <div>
                <h3 className="text-lg font-semibold text-white">Plagiarism Report</h3>
                <p className="text-sm text-blue-100">{selectedReport.student.name}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Similarity</p>
                  <p className={`text-2xl font-bold ${similarityColor(selectedReport.overallSimilarity)}`}>
                    {selectedReport.overallSimilarity}%
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Threshold</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedReport.threshold}%</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded-md text-xs font-medium ${statusBadge(selectedReport.status)}`}>
                    {statusLabel[selectedReport.status]}
                  </span>
                </div>
              </div>

              {selectedReport.flagged && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  This submission exceeds the flag threshold and should be reviewed before grading.
                </div>
              )}

              {selectedReport.extractionNote && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Extraction quality warning</p>
                    <p className="mt-0.5">{selectedReport.extractionNote}</p>
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                      {selectedReport.extractedCharacterCount} character{selectedReport.extractedCharacterCount === 1 ? "" : "s"} extracted from this submission.
                    </p>
                  </div>
                </div>
              )}

              {/* Matched submissions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Matched Submissions</h4>
                {selectedReport.matches.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No significant matches found.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedReport.matches.map((m, idx) => (
                      <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">{m.matchedStudentName}</span>
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {m.matchType === "previous_year" ? `Prior year · ${m.academicYear}` : "Same assignment"}
                            </span>
                          </div>
                          <span className={`font-semibold text-sm ${similarityColor(m.similarityPercentage)}`}>
                            {m.similarityPercentage}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" /> {m.sourceAssignmentTitle}
                        </p>
                        {m.matchedSections.length > 0 && (
                          <div className="space-y-1.5">
                            {m.matchedSections.map((s, sIdx) => (
                              <p
                                key={sIdx}
                                className="text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-gray-700 dark:text-gray-300 rounded px-2 py-1.5 font-mono leading-relaxed"
                              >
                                "…{s.excerpt}…"
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Review</h4>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="Add review notes (optional)…"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
                {selectedReport.reviewedBy && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last reviewed by {selectedReport.reviewedBy.name}
                    {selectedReport.reviewedAt ? ` on ${new Date(selectedReport.reviewedAt).toLocaleDateString()}` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => submitReview("cleared")}
                disabled={reviewSubmitting}
                className="px-4 py-2 text-sm border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-60"
              >
                Mark as Cleared
              </button>
              <button
                onClick={() => submitReview("reviewed")}
                disabled={reviewSubmitting}
                className="px-4 py-2 text-sm border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-60"
              >
                Mark as Reviewed
              </button>
              <button
                onClick={() => submitReview("action_taken")}
                disabled={reviewSubmitting}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-60"
              >
                Action Taken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
