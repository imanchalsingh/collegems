import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import {
  Lock,
  Unlock,
  Plus,
  Play,
  RotateCcw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Loader2,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import EmptyState from "../components/EmptyState";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Semester {
  _id: string;
  semester: string;
  isFrozen: boolean;
  isActive: boolean;
  activatedAt?: string;
  deactivatedAt?: string;
  activatedBy?: { name: string };
  frozenBy?: { name: string };
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Confirmation modal shown before activating a new session */
const ConfirmActivateModal: React.FC<{
  newSession: string;
  activeCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ newSession, activeCount, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    />
    {/* Modal */}
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
      {/* Close */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <X size={20} />
      </button>

      {/* Icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto mb-4">
        <AlertTriangle size={28} className="text-amber-500" />
      </div>

      <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
        Activate New Academic Session?
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
        You are about to activate{" "}
        <span className="font-semibold text-gray-900 dark:text-white">
          "{newSession}"
        </span>{" "}
        as the current academic session.
      </p>

      {activeCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
          <div className="flex gap-2 items-start">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">{activeCount} currently-active session(s)</span> will
              be automatically <span className="font-semibold">frozen (read-only)</span>. No new
              records (attendance, results, assignments) can be created inside
              them until manually reopened.
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-500 text-center mb-6">
        Historical data in all sessions remains fully accessible and readable.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
          {loading ? "Activating…" : "Yes, Activate"}
        </button>
      </div>
    </div>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ sem: Semester }> = ({ sem }) => {
  if (sem.isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  }
  if (sem.isFrozen) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
        <Lock size={10} />
        Frozen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
      <Unlock size={10} />
      Open
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SemesterManagement: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New session form
  const [newSessionName, setNewSessionName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [activating, setActivating] = useState(false);

  // Toast / feedback
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSemesters = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/semesters");
      setSemesters(data);
    } catch (error) {
      console.error("Error fetching semesters", error);
      showToast("Failed to load sessions.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Activate new session ───────────────────────────────────────────────────
  const handleActivate = async () => {
    try {
      setActivating(true);
      const { data } = await api.post("/semesters/activate", {
        semester: newSessionName.trim(),
      });
      showToast(data.message, "success");
      setNewSessionName("");
      setShowConfirm(false);
      await fetchSemesters();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to activate session.", "error");
    } finally {
      setActivating(false);
    }
  };

  // ── Toggle freeze ──────────────────────────────────────────────────────────
  const handleToggleFreeze = async (sem: Semester) => {
    const key = `toggle-${sem._id}`;
    try {
      setActionLoading(key);
      const newFrozen = !sem.isFrozen;
      const { data } = await api.post(`/semesters/${sem.semester}/toggle`, {
        isFrozen: newFrozen,
      });
      showToast(data.message, "success");
      await fetchSemesters();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update freeze status.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reopen session ─────────────────────────────────────────────────────────
  const handleReopen = async (sem: Semester) => {
    const key = `reopen-${sem._id}`;
    try {
      setActionLoading(key);
      const { data } = await api.post(`/semesters/${sem.semester}/reopen`);
      showToast(data.message, "success");
      await fetchSemesters();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to reopen session.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeSession = semesters.find((s) => s.isActive);
  const activeSessions = semesters.filter((s) => s.isActive);
  const otherSessions = semesters.filter((s) => !s.isActive);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading academic sessions…</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-300 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* ── No Active Session Banner ── */}
      {!activeSession && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4">
          <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              No active academic session
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              New records (attendance, results, assignments) cannot be restricted to a session until one is activated.
              Use the panel below to start a new session.
            </p>
          </div>
        </div>
      )}

      {/* ── Active Session Hero Card ── */}
      {activeSession && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 text-white shadow-lg">
          {/* Background decoration */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldCheck size={28} className="text-white" />
              </div>
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-widest mb-1">
                  Current Active Session
                </p>
                <h2 className="text-2xl font-bold">{activeSession.semester}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                  <span className="text-emerald-100 text-xs">
                    Activated {formatDate(activeSession.activatedAt)}
                    {activeSession.activatedBy?.name && ` by ${activeSession.activatedBy.name}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-emerald-100 text-xs">Status</p>
                <p className="text-sm font-semibold flex items-center gap-1 justify-end">
                  <CheckCircle2 size={14} />
                  Open for entries
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Start New Session Panel ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Plus size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Start New Academic Session
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 ml-12">
          Activating a new session will automatically freeze all currently-open sessions (making them read-only).
          Historical data in those sessions will still be fully accessible.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 ml-0 sm:ml-12">
          <input
            id="new-session-name"
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSessionName.trim()) setShowConfirm(true);
            }}
            placeholder='e.g. "Fall 2025-26" or "Semester 3"'
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button
            type="button"
            disabled={!newSessionName.trim()}
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Play size={15} />
            Activate Session
          </button>
        </div>
      </div>

      {/* ── Sessions Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <BookOpen size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                All Academic Sessions
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {semesters.length} session{semesters.length !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>
        </div>

        {semesters.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-7 h-7 text-blue-600" />}
            title="No sessions yet"
            description="Create your first academic session to get started."
            actionLabel="Create Session"
            onAction={() => {
              const input = document.getElementById("new-session-name");
              input?.focus();
              input?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            actionHint="Focuses the session name input above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Session</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Activated On</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Closed On</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Closed By</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {semesters.map((sem) => {
                  const isToggling = actionLoading === `toggle-${sem._id}`;
                  const isReopening = actionLoading === `reopen-${sem._id}`;
                  const anyLoading = isToggling || isReopening;

                  return (
                    <tr
                      key={sem._id}
                      className={`transition-colors ${
                        sem.isActive
                          ? "bg-emerald-50/50 dark:bg-emerald-900/10"
                          : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
                      }`}
                    >
                      {/* Session name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {sem.isActive && (
                            <ChevronRight
                              size={14}
                              className="text-emerald-500 shrink-0"
                            />
                          )}
                          <span
                            className={`font-semibold ${
                              sem.isActive
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {sem.semester}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge sem={sem} />
                      </td>

                      {/* Activated On */}
                      <td className="px-4 py-4 hidden md:table-cell text-gray-500 dark:text-gray-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="shrink-0" />
                          {formatDate(sem.activatedAt)}
                        </div>
                      </td>

                      {/* Closed On */}
                      <td className="px-4 py-4 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">
                        {sem.deactivatedAt ? (
                          <div className="flex items-center gap-1.5">
                            <Lock size={12} className="shrink-0" />
                            {formatDate(sem.deactivatedAt)}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Closed By */}
                      <td className="px-4 py-4 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">
                        {sem.frozenBy?.name ?? "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reopen button — only shown for frozen sessions */}
                          {sem.isFrozen && !sem.isActive && (
                            <button
                              onClick={() => handleReopen(sem)}
                              disabled={anyLoading}
                              title="Reopen this session (remove read-only)"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                            >
                              {isReopening ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RotateCcw size={12} />
                              )}
                              Reopen
                            </button>
                          )}

                          {/* Freeze / Unfreeze toggle */}
                          <button
                            onClick={() => handleToggleFreeze(sem)}
                            disabled={anyLoading}
                            title={sem.isFrozen ? "Unfreeze semester" : "Freeze semester"}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                              sem.isFrozen
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : sem.isFrozen ? (
                              <Unlock size={12} />
                            ) : (
                              <Lock size={12} />
                            )}
                            {sem.isFrozen ? "Unfreeze" : "Freeze"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active — open for new entries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock size={11} />
            <span>Frozen — read-only, historical data accessible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Unlock size={11} />
            <span>Open — not active but editable</span>
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <ConfirmActivateModal
          newSession={newSessionName.trim()}
          activeCount={activeSessions.length}
          onConfirm={handleActivate}
          onCancel={() => setShowConfirm(false)}
          loading={activating}
        />
      )}
    </div>
  );
};

export default SemesterManagement;
