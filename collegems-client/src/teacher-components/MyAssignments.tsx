import React, { useEffect, useState } from "react";
import {
  BookOpen, Users, Calendar, RefreshCw, Search,
  Briefcase, Hash, Building, ChevronRight, Info, X,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface Assignment {
  _id: string;
  course: {
    _id: string;
    name: string;
    code: string;
    semester: number;
    credits?: number;
    department: string;
    description?: string;
  };
  section: string;
  semester: number;
  academicYear: string;
  department: string;
}

const MyAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [error, setError] = useState("");

  const inputCls =
    "w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const fetchAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/faculty-assignments/my");
      setAssignments(extractArray(res.data));
    } catch {
      setError("Failed to load your assignments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);
const filtered = assignments.filter((a) => {
  const q = search.toLowerCase();

  return (
    (a.course?.name || "").toLowerCase().includes(q) ||
    (a.course?.code || "").toLowerCase().includes(q) ||
    (a.section || "").toLowerCase().includes(q) ||
    (a.department || "").toLowerCase().includes(q)
  );
});

  // Group by semester
  const bySemester = filtered.reduce<Record<number, Assignment[]>>((acc, a) => {
    if (!acc[a.semester]) acc[a.semester] = [];
    acc[a.semester].push(a);
    return acc;
  }, {});

  const colorVariants = [
    "border-l-blue-500 bg-blue-50 dark:bg-blue-900/10",
    "border-l-purple-500 bg-purple-50 dark:bg-purple-900/10",
    "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10",
    "border-l-amber-500 bg-amber-50 dark:bg-amber-900/10",
    "border-l-rose-500 bg-rose-50 dark:bg-rose-900/10",
  ];

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            My Assignments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Subjects and sections assigned to you by the HOD
          </p>
        </div>
        <button
          onClick={fetchAssignments}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Subjects", value: assignments.length,
            icon: <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
            bg: "bg-blue-50 dark:bg-blue-900/30",
          },
          {
            label: "Sections", value: new Set(assignments.map((a) => a.section)).size,
            icon: <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
            bg: "bg-purple-50 dark:bg-purple-900/30",
          },
          {
            label: "Semesters", value: new Set(assignments.map((a) => a.semester)).size,
            icon: <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
            bg: "bg-emerald-50 dark:bg-emerald-900/30",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
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

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by subject, code, section…"
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading your assignments…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-900 dark:text-white font-medium mb-1">No assignments yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search ? "No results match your search" : "The HOD hasn't assigned any subjects to you yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(bySemester)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([sem, items]) => (
              <div key={sem}>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Semester {sem}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((a, idx) => (
                    <div
                      key={a._id}
                      onClick={() => setSelected(a)}
                      className={`bg-white dark:bg-gray-800 rounded-xl border border-l-4 border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md transition-shadow ${colorVariants[idx % colorVariants.length]}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{a.course.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{a.course.code}</p>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                          Sec {a.section}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5" />
                          {a.department}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {a.academicYear}
                        </div>
                        {a.course.credits && (
                          <div className="flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5" />
                            {a.course.credits} Credits
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end text-xs text-blue-600 dark:text-blue-400 font-medium">
                        View details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Subject Details</h3>
              <button onClick={() => setSelected(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{selected.course.name}</p>
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{selected.course.code}</p>
              </div>
              {selected.course.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{selected.course.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Section", value: `Section ${selected.section}` },
                  { label: "Semester", value: `Semester ${selected.semester}` },
                  { label: "Academic Year", value: selected.academicYear },
                  { label: "Department", value: selected.department },
                  ...(selected.course.credits ? [{ label: "Credits", value: `${selected.course.credits} Credits` }] : []),
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAssignments;
