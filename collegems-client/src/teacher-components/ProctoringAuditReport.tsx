import { useEffect, useState } from "react";
import {
  Shield,
  RefreshCw,
  AlertTriangle,
  User,
  Eye,
} from "lucide-react";
import api from "../api/axios";

type SessionRow = {
  _id: string;
  sessionId: string;
  quizTitle?: string;
  studentName?: string;
  student?: { name?: string; email?: string; studentId?: string };
  quiz?: { title?: string };
  status: string;
  autoSubmitted?: boolean;
  warningCount?: number;
  violations?: { type: string; message?: string; at: string }[];
  startedAt: string;
  endedAt?: string;
};

export default function ProctoringAuditReport() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/proctoring/sessions");
      setSessions(res.data.sessions || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load proctoring logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-rose-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Proctoring audit log
            </h2>
            <p className="text-sm text-gray-500">
              Tab switches, face anomalies, and auto-submissions across online quizzes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Quiz</th>
                <th className="px-3 py-2">Violations</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s._id}
                  onClick={() => setSelected(s)}
                  className={`cursor-pointer border-t border-gray-100 hover:bg-rose-50/50 dark:border-gray-800 dark:hover:bg-rose-950/20 ${
                    selected?._id === s._id ? "bg-rose-50 dark:bg-rose-950/30" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {s.studentName || s.student?.name || "—"}
                    </div>
                    <div className="text-xs text-gray-500">{s.student?.studentId || s.sessionId}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {s.quizTitle || s.quiz?.title || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono">{s.violations?.length || 0}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        s.autoSubmitted
                          ? "bg-red-100 text-red-700"
                          : s.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {s.autoSubmitted ? "auto-submitted" : s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && sessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    No proctoring sessions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          {!selected ? (
            <p className="text-sm text-gray-500">Select a session to inspect violations.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Eye className="h-4 w-4" /> Session detail
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                <p className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {selected.studentName || selected.student?.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Warnings: {selected.warningCount || 0} · Started{" "}
                  {new Date(selected.startedAt).toLocaleString()}
                </p>
              </div>
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {(selected.violations || []).map((v, i) => (
                  <li
                    key={`${v.type}-${i}`}
                    className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    <div className="flex items-center gap-1 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {v.type}
                    </div>
                    <p className="text-xs opacity-80">{v.message}</p>
                    <p className="text-[10px] opacity-60">
                      {v.at ? new Date(v.at).toLocaleString() : ""}
                    </p>
                  </li>
                ))}
                {!selected.violations?.length && (
                  <li className="text-sm text-gray-500">No violations recorded.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
