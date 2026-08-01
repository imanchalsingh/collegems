import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  RefreshCw,
  Shield,
  ShieldOff,
  Database,
  Gauge,
} from "lucide-react";
import api from "../api/axios";

interface TierStats {
  hits: number;
  blocks: number;
}

interface BannedIp {
  ip: string;
  reason: string;
  violations: number;
  untilIso: string;
}

interface Violation {
  ip: string;
  role: string;
  tier: string;
  path: string;
  method: string;
  at: string;
}

interface SecurityMetrics {
  storeBackend: string;
  redisReady: boolean;
  windowMs: number;
  tiers: Record<string, number>;
  banThreshold: number;
  banDurationMs: number;
  blockedRequests: number;
  rateLimitHits: number;
  banEvents: number;
  byTier: Record<string, TierStats>;
  bannedIps: BannedIp[];
  recentViolations: Violation[];
}

export default function SecurityMetricsDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unbanning, setUnbanning] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/security-metrics");
      setMetrics(res.data.metrics);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load security metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 15000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  const handleUnban = async (ip: string) => {
    try {
      setUnbanning(ip);
      await api.post("/security-metrics/unban", { ip });
      await fetchMetrics();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to unban IP");
    } finally {
      setUnbanning(null);
    }
  };

  const tierEntries = Object.entries(metrics?.tiers || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Rate Limit &amp; Threat Protection
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Role-based API limits, Redis-backed sliding windows when available, and auto-ban
            violations.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Gauge className="w-4 h-4" />}
          label="Rate limit hits"
          value={metrics?.rateLimitHits ?? "—"}
          accent="bg-amber-500"
        />
        <MetricCard
          icon={<Ban className="w-4 h-4" />}
          label="Blocked requests"
          value={metrics?.blockedRequests ?? "—"}
          accent="bg-rose-500"
        />
        <MetricCard
          icon={<ShieldOff className="w-4 h-4" />}
          label="Auto-ban events"
          value={metrics?.banEvents ?? "—"}
          accent="bg-purple-500"
        />
        <MetricCard
          icon={<Database className="w-4 h-4" />}
          label="Store backend"
          value={metrics?.storeBackend ?? "—"}
          accent="bg-teal-500"
          sub={metrics?.redisReady ? "Redis connected" : "Memory fallback"}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-l-4 border-teal-500 px-4 py-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Tier limits (per minute)</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Window {metrics ? Math.round(metrics.windowMs / 1000) : 60}s · Ban after{" "}
            {metrics?.banThreshold ?? 10} violations
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {tierEntries.map(([tier, max]) => {
            const stats = metrics?.byTier?.[tier];
            return (
              <div
                key={tier}
                className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2"
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">{tier}</p>
                <p className="text-lg font-semibold tabular-nums">{max} req</p>
                <p className="text-[11px] text-gray-400">
                  hits {stats?.hits ?? 0} · blocks {stats?.blocks ?? 0}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-l-4 border-rose-500 px-4 py-3 flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Banned IPs</h3>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {(metrics?.bannedIps || []).length === 0 && (
              <p className="text-sm text-gray-400">No IPs currently banned.</p>
            )}
            {(metrics?.bannedIps || []).map((ban) => (
              <div
                key={ban.ip}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-mono font-medium">{ban.ip}</p>
                  <p className="text-xs text-gray-500">
                    until {new Date(ban.untilIso).toLocaleString()} · {ban.violations} violations
                  </p>
                </div>
                <button
                  type="button"
                  disabled={unbanning === ban.ip}
                  onClick={() => handleUnban(ban.ip)}
                  className="rounded-md border border-gray-300 px-2.5 py-1 text-xs dark:border-gray-600"
                >
                  {unbanning === ban.ip ? "…" : "Unban"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-l-4 border-amber-500 px-4 py-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent violations</h3>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {(metrics?.recentViolations || []).length === 0 && (
              <p className="text-sm text-gray-400">No recent rate-limit violations.</p>
            )}
            {(metrics?.recentViolations || []).map((v, idx) => (
              <div
                key={`${v.at}-${idx}`}
                className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-xs"
              >
                <p className="font-mono text-sm">{v.ip}</p>
                <p className="text-gray-500">
                  {v.method} {v.path} · {v.role}/{v.tier}
                </p>
                <p className="text-gray-400">{new Date(v.at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`h-1 ${accent}`} />
      <div className="p-4">
        <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
          {icon}
          {label}
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white capitalize">
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
