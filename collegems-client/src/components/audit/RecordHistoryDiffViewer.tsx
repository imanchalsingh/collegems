import { useCallback, useEffect, useMemo, useState } from "react";
import {
  History,
  RotateCcw,
  Loader2,
  Shield,
  MonitorSmartphone,
  Globe,
  ChevronRight,
} from "lucide-react";
import api from "../../api/axios";

interface EditorInfo {
  name?: string;
  email?: string;
  role?: string;
}

interface FieldDiff {
  path: string;
  type: "added" | "deleted" | "modified";
  oldValue?: unknown;
  newValue?: unknown;
}

interface SnapshotRow {
  _id: string;
  modelName: string;
  recordId: string;
  operation: "update" | "delete" | "replace";
  createdAt: string;
  editor?: EditorInfo;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  fieldDiffs?: FieldDiff[];
  data?: Record<string, unknown>;
}

interface DiffPayload {
  snapshotId: string;
  modelName: string;
  recordId: string;
  operation: string;
  createdAt: string;
  editor?: EditorInfo;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  before: Record<string, unknown>;
  after: Record<string, unknown> | null;
  fieldDiffs: FieldDiff[];
}

const MODEL_OPTIONS = ["Results", "Attendance", "Fee", "User"] as const;

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DiffRow({ row }: { row: FieldDiff }) {
  const tone =
    row.type === "added"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : row.type === "deleted"
        ? "bg-red-50 border-red-200 text-red-900"
        : "bg-amber-50 border-amber-200 text-amber-900";

  return (
    <div className={`rounded-lg border p-3 text-sm ${tone}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <code className="font-mono text-xs font-semibold">{row.path}</code>
        <span className="text-[10px] uppercase tracking-wide font-semibold opacity-80">
          {row.type}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] uppercase text-red-700/80 mb-1">Previous</p>
          <pre className="whitespace-pre-wrap break-all text-xs bg-white/60 rounded p-2 border border-red-100">
            {formatValue(row.oldValue)}
          </pre>
        </div>
        <div>
          <p className="text-[10px] uppercase text-emerald-700/80 mb-1">New</p>
          <pre className="whitespace-pre-wrap break-all text-xs bg-white/60 rounded p-2 border border-emerald-100">
            {formatValue(row.newValue)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function RecordHistoryDiffViewer() {
  const [modelName, setModelName] = useState<(typeof MODEL_OPTIONS)[number]>("Results");
  const [recordId, setRecordId] = useState("");
  const [timeline, setTimeline] = useState<SnapshotRow[]>([]);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [diff, setDiff] = useState<DiffPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: SnapshotRow[] }>("/snapshots/search", {
        params: { modelName, limit: 40 },
      });
      setTimeline(res.data.data || []);
      setSliderIndex(0);
      setDiff(null);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load snapshot timeline");
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [modelName]);

  const loadForRecord = useCallback(async () => {
    if (!recordId.trim()) {
      setError("Enter a record ID to load its history");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: SnapshotRow[] }>(
        `/snapshots/${modelName}/${recordId.trim()}`
      );
      setTimeline(res.data.data || []);
      setSliderIndex(0);
      setDiff(null);
      setMessage(
        res.data.data?.length
          ? `Loaded ${res.data.data.length} revision(s)`
          : "No snapshots for this record yet"
      );
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load record history");
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [modelName, recordId]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const selected = useMemo(
    () => (timeline.length ? timeline[sliderIndex] : null),
    [timeline, sliderIndex]
  );

  const loadDiff = useCallback(async (snapshotId: string) => {
    setDiffLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: DiffPayload }>(`/snapshots/${snapshotId}/diff`);
      setDiff(res.data.data);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load field diff");
      setDiff(null);
    } finally {
      setDiffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected?._id) {
      loadDiff(selected._id);
    }
  }, [selected?._id, loadDiff]);

  const handleRestore = async () => {
    if (!selected) return;
    if (
      !window.confirm(
        "Restore this point-in-time snapshot? The current record will be overwritten (a new audit entry is created)."
      )
    ) {
      return;
    }
    setRestoring(true);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>(`/snapshots/${selected._id}/restore`);
      setMessage(res.data.message || "Record restored");
      if (recordId.trim()) await loadForRecord();
      else await loadRecent();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  const fieldDiffs = diff?.fieldDiffs?.length
    ? diff.fieldDiffs
    : selected?.fieldDiffs || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          Field-Level Audit &amp; Point-in-Time Restore
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Side-by-side JSON diffs for Marks, Attendance, and Fees — with one-click rollback.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm block">
            <span className="text-gray-600 dark:text-gray-300">Model</span>
            <select
              value={modelName}
              onChange={(e) =>
                setModelName(e.target.value as (typeof MODEL_OPTIONS)[number])
              }
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === "Results" ? "Results (Marks)" : m}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block sm:col-span-2">
            <span className="text-gray-600 dark:text-gray-300">Record ID (optional)</span>
            <div className="mt-1 flex gap-2">
              <input
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                placeholder="Mongo ObjectId of the record"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={loadForRecord}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              >
                Load history
              </button>
              <button
                type="button"
                onClick={loadRecent}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
              >
                Recent
              </button>
            </div>
          </label>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`text-sm rounded-lg border px-3 py-2 ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : timeline.length === 0 ? (
        <div className="text-center text-gray-500 py-10 text-sm border border-dashed border-gray-300 rounded-xl">
          No snapshots yet. Edit a Results, Attendance, or Fee record to start the trail.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <label className="text-sm font-medium text-gray-800 dark:text-gray-100 block mb-2">
                Timeline slider ({timeline.length - sliderIndex} of {timeline.length})
              </label>
              <input
                type="range"
                min={0}
                max={Math.max(0, timeline.length - 1)}
                value={sliderIndex}
                onChange={(e) => setSliderIndex(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <p className="text-xs text-gray-500 mt-2">
                Drag to walk through historical revisions (newest → oldest).
              </p>
            </div>

            <ul className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
              {timeline.map((snap, idx) => (
                <li key={snap._id}>
                  <button
                    type="button"
                    onClick={() => setSliderIndex(idx)}
                    className={`w-full text-left px-4 py-3 text-sm flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                      idx === sliderIndex ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
                    }`}
                  >
                    <ChevronRight
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        idx === sliderIndex ? "text-indigo-600" : "text-gray-300"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {snap.operation} · {snap.modelName}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(snap.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {snap.editor?.name || "Unknown editor"}
                        {snap.actorRole || snap.editor?.role
                          ? ` · ${snap.actorRole || snap.editor?.role}`
                          : ""}
                      </p>
                      <p className="text-[11px] font-mono text-gray-400 truncate">
                        {snap.recordId}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selected && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Revision detail
                  </h3>
                  <button
                    type="button"
                    onClick={handleRestore}
                    disabled={restoring}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm disabled:opacity-50"
                  >
                    {restoring ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    One-click restore
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-start gap-1.5">
                    <Shield className="w-3.5 h-3.5 mt-0.5" />
                    <span>
                      Role: {selected.actorRole || selected.editor?.role || "—"}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Globe className="w-3.5 h-3.5 mt-0.5" />
                    <span>IP: {selected.ipAddress || "—"}</span>
                  </div>
                  <div className="flex items-start gap-1.5 min-w-0">
                    <MonitorSmartphone className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="truncate" title={selected.userAgent}>
                      UA: {selected.userAgent || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Field-level diff{" "}
                <span className="text-xs font-normal text-gray-500">
                  (Red = deleted / previous · Green = added / new)
                </span>
              </h3>

              {diffLoading ? (
                <div className="flex justify-center py-8 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : fieldDiffs.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No field deltas stored for this revision (complex operator update or
                  delete-only snapshot). Full before-state is still available for restore.
                </p>
              ) : (
                <div className="space-y-3 max-h-[28rem] overflow-y-auto">
                  {fieldDiffs.map((row) => (
                    <DiffRow key={`${row.path}-${row.type}`} row={row} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
