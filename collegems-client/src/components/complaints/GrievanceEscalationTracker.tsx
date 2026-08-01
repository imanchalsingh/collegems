import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Timer,
} from "lucide-react";
import api from "../../api/axios";

interface SlaInfo {
  state: string;
  remainingMs: number | null;
  breached: boolean;
  percentElapsed: number;
  hours?: number;
  deadline?: string;
  remainingLabel?: string;
  chain?: string[];
  currentHandler?: string;
}

interface EscalationComplaint {
  _id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  escalationLevel: number;
  currentHandlerRole?: string;
  slaBreached?: boolean;
  slaDeadline?: string;
  isAnonymous?: boolean;
  anonymousTrackingId?: string;
  student?: { name?: string; studentId?: string };
  escalationHistory?: {
    fromHandler?: string;
    toHandler: string;
    reason?: string;
    escalatedAt?: string;
  }[];
  sla?: SlaInfo;
}

interface MatrixPayload {
  slaHours: Record<string, number>;
  matrix: Record<string, string[]>;
  summary: { open: number; breached: number; approaching: number };
  complaints: EscalationComplaint[];
}

const stateStyles: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-orange-100 text-orange-800 border-orange-200",
  breached: "bg-red-100 text-red-800 border-red-200",
  resolved: "bg-slate-100 text-slate-700 border-slate-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

function CountdownBar({ sla }: { sla?: SlaInfo }) {
  if (!sla) return null;
  const pct = Math.min(100, Math.max(0, sla.percentElapsed || 0));
  const barColor =
    sla.state === "breached"
      ? "bg-red-500"
      : sla.state === "critical"
        ? "bg-orange-500"
        : sla.state === "warning"
          ? "bg-amber-500"
          : "bg-emerald-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{sla.remainingLabel || "SLA"}</span>
        <span>{Math.round(pct)}% elapsed</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function GrievanceEscalationTracker() {
  const [data, setData] = useState<MatrixPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [escalatingId, setEscalatingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tick, setTick] = useState(0);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/complaints/escalation-matrix");
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load escalation matrix.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const complaints = useMemo(() => data?.complaints || [], [data, tick]);

  const handleRunSla = async () => {
    try {
      setRunning(true);
      setError("");
      setSuccess("");
      const res = await api.post("/complaints/run-sla");
      setSuccess(
        `SLA processor finished. Checked ${res.data.data.processed} open complaint(s).`
      );
      await loadMatrix();
    } catch (err) {
      setError("Failed to run SLA processor.");
    } finally {
      setRunning(false);
    }
  };

  const handleEscalate = async (id: string) => {
    try {
      setEscalatingId(id);
      setError("");
      setSuccess("");
      const res = await api.post(`/complaints/${id}/escalate`, {
        reason: "Manual escalation from admin dashboard",
      });
      setSuccess(res.data.message || "Escalation completed.");
      await loadMatrix();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Escalation failed.";
      setError(message);
    } finally {
      setEscalatingId("");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert size={18} className="text-indigo-600" />
            Grievance Escalation Matrix & SLA Timers
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Low 72h · Medium 48h · High/Urgent 12h — auto-escalates Warden → Dean →
            HOD when deadlines expire.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadMatrix}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleRunSla}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-2 text-sm"
          >
            {running ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Timer size={14} />
            )}
            Run SLA Check
          </button>
        </div>
      </div>

      {(error || success) && (
        <p
          className={`text-sm rounded-xl px-3 py-2 border ${
            error
              ? "text-red-700 bg-red-50 border-red-200"
              : "text-emerald-700 bg-emerald-50 border-emerald-200"
          }`}
        >
          {error || success}
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Open grievances</p>
          <p className="text-2xl font-semibold">{data?.summary.open ?? 0}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Approaching SLA</p>
          <p className="text-2xl font-semibold text-amber-900">
            {data?.summary.approaching ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">SLA breached</p>
          <p className="text-2xl font-semibold text-red-900">
            {data?.summary.breached ?? 0}
          </p>
        </div>
      </div>

      {data?.matrix && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-x-auto">
          <h4 className="text-sm font-semibold mb-3">Escalation Paths</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Level 0</th>
                <th className="py-2 pr-3">Level 1</th>
                <th className="py-2">Level 2</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.matrix).map(([category, chain]) => (
                <tr
                  key={category}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="py-2 pr-3 font-medium">{category}</td>
                  {chain.map((role) => (
                    <td key={role} className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                      {role}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-3">
        {complaints.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500">
            <CheckCircle2 className="mx-auto mb-2 text-emerald-500" />
            No open grievances requiring escalation.
          </div>
        ) : (
          complaints.map((c) => (
            <article
              key={c._id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {c.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {c.category} · {c.priority} ·{" "}
                    {c.isAnonymous
                      ? `Anonymous (${c.anonymousTrackingId})`
                      : c.student?.name || "Student"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      stateStyles[c.sla?.state || "unknown"]
                    }`}
                  >
                    {(c.sla?.state || "unknown").toUpperCase()}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                    L{c.escalationLevel} · {c.currentHandlerRole || c.sla?.currentHandler}
                  </span>
                </div>
              </div>

              <CountdownBar sla={c.sla} />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={12} />
                  Deadline{" "}
                  {c.slaDeadline
                    ? new Date(c.slaDeadline).toLocaleString()
                    : "N/A"}
                </span>
                <button
                  type="button"
                  disabled={escalatingId === c._id || c.escalationLevel >= 2}
                  onClick={() => handleEscalate(c._id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {escalatingId === c._id ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : (
                    <AlertTriangle size={12} />
                  )}
                  Escalate Now
                </button>
              </div>

              {c.escalationHistory && c.escalationHistory.length > 0 && (
                <ul className="text-xs text-slate-500 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {c.escalationHistory.slice(-3).map((event, idx) => (
                    <li key={`${c._id}-${idx}`}>
                      {event.fromHandler || "L?"} → {event.toHandler}
                      {event.escalatedAt
                        ? ` · ${new Date(event.escalatedAt).toLocaleString()}`
                        : ""}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
