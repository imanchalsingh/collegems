import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Mail,
  FileText,
  BarChart3,
  RefreshCw,
  Play,
} from "lucide-react";
import api from "../api/axios";
import { useSocket } from "../context/SocketContext";

interface QueueCounts {
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
}

interface JobRow {
  id: string;
  name: string;
  queueName: string;
  state: string;
  progress: number;
  attemptsMade?: number;
  failedReason?: string | null;
  timestamp?: number;
  data?: {
    requestedBy?: string;
    to?: string;
    title?: string;
    recipientCount?: number;
  };
}

interface QueueSnap {
  name: string;
  counts: QueueCounts;
  jobs: JobRow[];
}

interface DashboardData {
  mode: string;
  redis: { mock: boolean; ready: boolean };
  queues: QueueSnap[];
  totals: QueueCounts;
}

const queueIcon = (name: string) => {
  if (name.includes("Email")) return <Mail className="w-4 h-4" />;
  if (name.includes("PDF") || name.includes("Report"))
    return <FileText className="w-4 h-4" />;
  return <BarChart3 className="w-4 h-4" />;
};

const stateTone = (state: string) => {
  switch (state) {
    case "completed":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "failed":
      return "text-red-700 bg-red-50 border-red-200";
    case "active":
      return "text-blue-700 bg-blue-50 border-blue-200";
    default:
      return "text-slate-700 bg-slate-50 border-slate-200";
  }
};

export default function QueueMonitorDashboard() {
  const { socket, isConnected } = useSocket();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<
    Array<{ at: string; text: string }>
  >([]);
  const [enqueueBusy, setEnqueueBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ data: DashboardData }>("/queues/dashboard");
      setData(res.data.data);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load queue dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!socket) return;

    const onProgress = (payload: {
      queue?: string;
      jobId?: string;
      progress?: number;
      status?: string;
    }) => {
      setLiveEvents((prev) =>
        [
          {
            at: new Date().toLocaleTimeString(),
            text: `${payload.queue} #${payload.jobId} → ${payload.status} (${payload.progress ?? 0}%)`,
          },
          ...prev,
        ].slice(0, 30)
      );
      load();
    };

    const onDone = (payload: { queue?: string; jobId?: string }) => {
      setLiveEvents((prev) =>
        [
          {
            at: new Date().toLocaleTimeString(),
            text: `Completed ${payload.queue} #${payload.jobId}`,
          },
          ...prev,
        ].slice(0, 30)
      );
      load();
    };

    const onFail = (payload: {
      queue?: string;
      jobId?: string;
      error?: string;
    }) => {
      setLiveEvents((prev) =>
        [
          {
            at: new Date().toLocaleTimeString(),
            text: `Failed ${payload.queue} #${payload.jobId}: ${payload.error}`,
          },
          ...prev,
        ].slice(0, 30)
      );
      load();
    };

    socket.on("queue:job_progress", onProgress);
    socket.on("queue:job_completed", onDone);
    socket.on("queue:job_failed", onFail);
    return () => {
      socket.off("queue:job_progress", onProgress);
      socket.off("queue:job_completed", onDone);
      socket.off("queue:job_failed", onFail);
    };
  }, [socket, load]);

  const enqueueDemo = async (kind: "email" | "report" | "analytics") => {
    setEnqueueBusy(true);
    setMessage(null);
    try {
      if (kind === "email") {
        await api.post("/queues/email", {
          to: "demo@college.edu",
          subject: "Queue demo email",
          text: "This email was enqueued via BullMQ EmailQueue.",
        });
      } else if (kind === "report") {
        await api.post("/queues/reports", {
          title: "Demo Placement Shortlist",
          lines: ["Student A — 92%", "Student B — 81%", "Student C — 74%"],
        });
      } else {
        await api.post("/queues/analytics", { studentIds: [] });
      }
      setMessage(`${kind} job accepted (202) — watch progress below`);
      await load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setMessage(ax.response?.data?.message || "Enqueue failed");
    } finally {
      setEnqueueBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Queue Monitor
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            BullMQ background jobs — Email, Report PDF, Analytics. Mode:{" "}
            <strong>{data?.mode || "—"}</strong>
            {data?.redis?.mock ? " (Redis mock / memory fallback)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              isConnected
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-amber-300 bg-amber-50 text-amber-800"
            }`}
          >
            Socket {isConnected ? "live" : "offline"}
          </span>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {message && (
        <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            ["waiting", Clock, data?.totals.waiting],
            ["active", Loader2, data?.totals.active],
            ["completed", CheckCircle2, data?.totals.completed],
            ["failed", XCircle, data?.totals.failed],
          ] as const
        ).map(([label, Icon, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs uppercase text-slate-500 flex items-center gap-1">
              <Icon className="w-3.5 h-3.5" /> {label}
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Enqueue demo job</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enqueueBusy}
            onClick={() => enqueueDemo("email")}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" /> EmailQueue
          </button>
          <button
            type="button"
            disabled={enqueueBusy}
            onClick={() => enqueueDemo("report")}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" /> ReportPDFQueue
          </button>
          <button
            type="button"
            disabled={enqueueBusy}
            onClick={() => enqueueDemo("analytics")}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" /> AnalyticsQueue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(data?.queues || []).map((q) => (
          <div
            key={q.name}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                {queueIcon(q.name)} {q.name}
              </h3>
              <span className="text-[11px] text-slate-500">
                A{q.counts.active || 0} / W{q.counts.waiting || 0} / F
                {q.counts.failed || 0}
              </span>
            </div>
            <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {(q.jobs || []).slice(0, 12).map((j) => (
                <li key={`${q.name}-${j.id}`} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{j.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded border capitalize ${stateTone(
                        j.state
                      )}`}
                    >
                      {j.state}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    {j.name}
                    {typeof j.progress === "number" ? ` · ${j.progress}%` : ""}
                  </p>
                  {j.failedReason && (
                    <p className="text-red-600 mt-0.5 truncate">{j.failedReason}</p>
                  )}
                </li>
              ))}
              {!q.jobs?.length && (
                <li className="px-3 py-6 text-center text-slate-400 text-xs">
                  No recent jobs
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-800 mb-2">Live WebSocket events</h3>
        {liveEvents.length === 0 ? (
          <p className="text-sm text-slate-500">
            Waiting for queue:job_progress events…
          </p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-y-auto text-xs font-mono">
            {liveEvents.map((e, i) => (
              <li key={`${e.at}-${i}`} className="text-slate-700">
                <span className="text-slate-400">{e.at}</span> {e.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
