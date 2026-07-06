import React, { useEffect, useState } from "react";
import {
  GraduationCap, Mail, Phone, BookOpen, Search,
  RefreshCw, User, Building, Hash, X,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface FacultyAssignment {
  _id: string;
  faculty: {
    _id: string;
    name: string;
    email: string;
    teacherId: string;
    department?: string;
    phone?: string;
  };
  course: {
    _id: string;
    name: string;
    code: string;
    credits?: number;
    description?: string;
  };
  section: string;
  semester: number;
  academicYear: string;
}

const FacultyView: React.FC = () => {
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FacultyAssignment | null>(null);
  const [error, setError] = useState("");

  const inputCls =
    "w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const fetchFaculty = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/faculty-assignments/for-student");
      setAssignments(extractArray(res.data));
    } catch {
      setError("Failed to load faculty information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

 const filtered = assignments.filter((a) => {
  const q = search.toLowerCase();

  return (
    (a.course?.name || "").toLowerCase().includes(q) ||
    (a.course?.code || "").toLowerCase().includes(q) ||
    (a.faculty?.name || "").toLowerCase().includes(q) ||
    (a.section || "").toLowerCase().includes(q)
  );
});

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const avatarColors = [
    "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  ];

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            My Subject Faculty
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Faculty assigned to your subjects this semester
          </p>
        </div>
        <button
          onClick={fetchFaculty}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by subject, code, faculty name…"
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading faculty information…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white mb-1">No faculty found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search ? "No results match your search" : "No faculty has been assigned to your subjects yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((a, idx) => (
            <div
              key={a._id}
              onClick={() => setSelected(a)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-lg transition-shadow"
            >
              {/* Subject badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{a.course.name}</h3>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{a.course.code}</p>
                </div>
                <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                  Sec {a.section}
                </span>
              </div>

              {/* Faculty info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                  {getInitials(a.faculty.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{a.faculty.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.faculty.email}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Sem {a.semester} · {a.academicYear}</span>
                {a.course.credits && <span>{a.course.credits} Credits</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Faculty Details</h3>
              <button onClick={() => setSelected(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Faculty card */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xl">
                  {getInitials(selected.faculty.name)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">{selected.faculty.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selected.faculty.teacherId}</p>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</h4>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {selected.faculty.email}
                </div>
                {selected.faculty.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selected.faculty.phone}
                  </div>
                )}
                {selected.faculty.department && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Building className="w-4 h-4 text-gray-400" />
                    {selected.faculty.department}
                  </div>
                )}
              </div>

              {/* Subject info */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subject</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Subject", value: selected.course.name },
                    { label: "Code", value: selected.course.code },
                    { label: "Section", value: `Section ${selected.section}` },
                    { label: "Semester", value: `Semester ${selected.semester}` },
                    { label: "Academic Year", value: selected.academicYear },
                    ...(selected.course.credits ? [{ label: "Credits", value: `${selected.course.credits}` }] : []),
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selected.course.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">{selected.course.description}</p>
              )}
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

export default FacultyView;
