import React, { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Edit2, Trash2, Search, RefreshCw, X,
  AlertTriangle, CheckCircle, BookOpen, BarChart2,
  ChevronDown, Filter, UserCheck, Briefcase,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Teacher {
  _id: string;
  name: string;
  email: string;
  teacherId: string;
  department?: string;
}

interface Course {
  _id: string;
  name: string;
  code: string;
  semester: number;
  credits?: number;
}

interface Assignment {
  _id: string;
  faculty: Teacher;
  course: Course;
  section: string;
  semester: number;
  academicYear: string;
  department: string;
  createdAt: string;
}

interface WorkloadEntry {
  _id: string;
  name: string;
  email: string;
  teacherId: string;
  department: string;
  assignmentCount: number;
  isOverloaded: boolean;
  workloadLimit: number;
  sections: string[];
}

type Tab = "assignments" | "workload";

const ACADEMIC_YEARS = ["2024-25", "2025-26", "2026-27"];
const SECTIONS = ["A", "B", "C", "D", "E"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const DEPARTMENTS = [
  "Computer Science", "Electrical", "Mechanical", "Civil",
  "Electronics", "Mathematics", "Physics", "Chemistry",
];

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";

// ─── Component ────────────────────────────────────────────────────────────────
const FacultyAssignment: React.FC = () => {
  const [tab, setTab] = useState<Tab>("assignments");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("2025-26");
  const [filterSemester, setFilterSemester] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error" | "warning"; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const emptyForm = {
    faculty: "", course: "", section: "", semester: "",
    academicYear: "2025-26", department: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const showToast = (type: "success" | "error" | "warning", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { academicYear: filterYear };
      if (filterSemester) params.semester = filterSemester;
      const res = await api.get("/faculty-assignments/all", { params });
      
      setAssignments(extractArray(res.data));
    } catch {
      showToast("error", "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterSemester]);

  const fetchWorkload = useCallback(async () => {
    try {
      const res = await api.get("/faculty-assignments/workload", {
        params: { academicYear: filterYear },
      });
      setWorkload(Array.isArray(res.data?.workload) ? res.data.workload : []);
    } catch {
      showToast("error", "Failed to load workload data");
    }
  }, [filterYear]);

  const fetchDropdowns = async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        api.get("/users/teachers"),
        api.get("/courses/all"),
      ]);
      
      setTeachers(extractArray(tRes.data));
      setCourses(extractArray(cRes.data));
    } catch {
      showToast("error", "Failed to load form data");
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (tab === "workload") fetchWorkload();
  }, [tab, fetchWorkload]);

  // ─── Form helpers ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    fetchDropdowns();
    setShowModal(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingId(a._id);
    setForm({
      faculty: a.faculty._id,
      course: a.course._id,
      section: a.section,
      semester: String(a.semester),
      academicYear: a.academicYear,
      department: a.department,
    });
    setFormError("");
    fetchDropdowns();
    setShowModal(true);
  };

  const handleCourseChange = (courseId: string) => {
    const safeCourses = Array.isArray(courses) ? courses : [];
    const course = safeCourses.find((c) => c._id === courseId);
    setForm((f) => ({
      ...f,
      course: courseId,
      semester: course ? String(course.semester) : f.semester,
    }));
  };

  const handleSubmit = async () => {
    if (!form.faculty || !form.course || !form.section || !form.semester || !form.academicYear || !form.department) {
      setFormError("All fields are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      if (editingId) {
        await api.put(`/faculty-assignments/${editingId}`, form);
        showToast("success", "Assignment updated successfully");
      } else {
        const res = await api.post("/faculty-assignments", form);
        if (res.data.warning) showToast("warning", res.data.warning);
        else showToast("success", "Assignment created successfully");
      }
      setShowModal(false);
      fetchAssignments();
      if (tab === "workload") fetchWorkload();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save assignment";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/faculty-assignments/${id}`);
      showToast("success", "Assignment removed");
      setConfirmDelete(null);
      fetchAssignments();
      if (tab === "workload") fetchWorkload();
    } catch {
      showToast("error", "Failed to delete assignment");
    }
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const filtered = safeAssignments.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.faculty?.name?.toLowerCase().includes(q) ||
      a.course?.name?.toLowerCase().includes(q) ||
      a.course?.code?.toLowerCase().includes(q) ||
      a.section?.toLowerCase().includes(q)
    );
  });

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const safeWorkload = Array.isArray(workload) ? workload : [];
  const overloadedCount = safeWorkload.filter((w) => w.isOverloaded).length;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : toast.type === "warning"
              ? "bg-amber-500 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Faculty Assignment Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Assign faculty members to subjects and sections
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Assignment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Assignments",
            value: safeAssignments.length,
            icon: <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
            bg: "bg-blue-50 dark:bg-blue-900/30",
          },
          {
            label: "Faculty Assigned",
            value: new Set(safeAssignments.filter(a => a.faculty?._id).map((a) => a.faculty._id)).size,
            icon: <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
            bg: "bg-emerald-50 dark:bg-emerald-900/30",
          },
          {
            label: "Sections Covered",
            value: new Set(safeAssignments.filter(a => a.section).map((a) => a.section)).size,
            icon: <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
            bg: "bg-purple-50 dark:bg-purple-900/30",
          },
          {
            label: "Overloaded Faculty",
            value: overloadedCount,
            icon: <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
            bg: "bg-rose-50 dark:bg-rose-900/30",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(["assignments", "workload"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t === "assignments" ? (
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Assignments
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> Workload
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by faculty, course, section…"
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            {ACADEMIC_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
          >
            <option value="">All Semesters</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
          <button
            onClick={() => { fetchAssignments(); if (tab === "workload") fetchWorkload(); }}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Assignments Tab ── */}
      {tab === "assignments" && (
        <>
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading assignments…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No assignments found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      {["Faculty", "Subject", "Section", "Semester", "Academic Year", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filtered.map((a) => (
                      <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{a.faculty?.name || "Unknown"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{a.faculty?.teacherId || "N/A"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{a.course?.name || "Unknown"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{a.course?.code || "N/A"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            Section {a.section}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Sem {a.semester}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.academicYear}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(a)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(a._id)}
                              className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                              title="Remove"
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
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                Showing {filtered.length} of {safeAssignments.length} assignments
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Workload Tab ── */}
      {tab === "workload" && (
        <div className="space-y-4">
          {overloadedCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                <strong>{overloadedCount} faculty member{overloadedCount > 1 ? "s are" : " is"} at or beyond</strong> the
                maximum workload limit. Review their assignments.
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {safeWorkload.map((w) => {
              const pct = Math.min((w.assignmentCount / w.workloadLimit) * 100, 100);
              const color =
                w.isOverloaded
                  ? "bg-red-500"
                  : pct >= 66
                  ? "bg-amber-400"
                  : "bg-emerald-500";
              return (
                <div
                  key={w._id}
                  className={`bg-white dark:bg-gray-800 rounded-xl border p-5 ${
                    w.isOverloaded
                      ? "border-red-300 dark:border-red-700"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{w.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{w.teacherId} · {w.department}</p>
                    </div>
                    {w.isOverloaded && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
                        <AlertTriangle className="w-3 h-3" /> Overloaded
                      </span>
                    )}
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Workload</span>
                      <span className="font-medium">{w.assignmentCount} / {w.workloadLimit}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(w.sections) ? w.sections : []).map((sec) => (
                      <span key={sec} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                        Sec {sec}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {safeWorkload.length === 0 && (
              <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <BarChart2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No workload data for {filterYear}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Assignment Form Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? "Edit Assignment" : "New Faculty Assignment"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {/* Faculty */}
                <div>
                  <label className={labelCls}>Faculty Member *</label>
                  <select
                    className={selectCls}
                    value={form.faculty}
                    onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))}
                  >
                    <option value="">Select faculty…</option>
                    {(Array.isArray(teachers) ? teachers : []).map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.teacherId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course */}
                <div>
                  <label className={labelCls}>Subject / Course *</label>
                  <select
                    className={selectCls}
                    value={form.course}
                    onChange={(e) => handleCourseChange(e.target.value)}
                  >
                    <option value="">Select course…</option>
                    {(Array.isArray(courses) ? courses : []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section & Semester */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Section *</label>
                    <select
                      className={selectCls}
                      value={form.section}
                      onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {SECTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Semester *</label>
                    <select
                      className={selectCls}
                      value={form.semester}
                      onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {SEMESTERS.map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Academic Year & Department */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Academic Year *</label>
                    <select
                      className={selectCls}
                      value={form.academicYear}
                      onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                    >
                      {ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Department *</label>
                    <select
                      className={selectCls}
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
              >
                {submitting ? "Saving…" : editingId ? "Update Assignment" : "Create Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Remove Assignment</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to remove this faculty assignment? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAssignment;