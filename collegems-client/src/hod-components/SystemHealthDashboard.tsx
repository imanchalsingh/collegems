import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { 
  Users, 
  Activity, 
  Archive, 
  RefreshCw, 
  Database, 
  Clock, 
  Cpu, 
  AlertCircle,
  FileText,
  Calendar,
  Award,
  MessageSquare
} from "lucide-react";

interface UserBreakdown {
  students: number;
  teachers: number;
  hods: number;
  parents: number;
}

interface ActionBreakdown {
  leaves: number;
  scholarships: number;
  bookings: number;
  complaints: number;
  examForms: number;
}

interface Metrics {
  activeUsers: {
    total: number;
    breakdown: UserBreakdown;
  };
  pendingActions: {
    total: number;
    breakdown: ActionBreakdown;
  };
  archivedRecords: {
    total: number;
  };
}

interface MemoryTelemetry {
  heapUsed: number;
  heapTotal: number;
  rss: number;
}

interface SystemTelemetry {
  dbStatus: string;
  dbState: number;
  uptime: number;
  memory: MemoryTelemetry;
  platform: string;
  nodeVersion: string;
}

interface HealthResponse {
  success: boolean;
  metrics: Metrics;
  system: SystemTelemetry;
}

export default function SystemHealthDashboard() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/system-health");
      if (res.data.success) {
        setData(res.data);
      } else {
        setError(res.data.message || "Failed to fetch health data");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Update uptime counter locally every second to make the dashboard feel alive and dynamic
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  // Sync state seconds with fetched uptime
  useEffect(() => {
    if (data?.system?.uptime) {
      setSeconds(Math.round(data.system.uptime));
    }
  }, [data]);

  const formatUptime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  };

  const getMemoryUsagePercent = () => {
    if (!data) return 0;
    const { heapUsed, heapTotal } = data.system.memory;
    return Math.round((heapUsed / heapTotal) * 100);
  };

  const isDbHealthy = data?.system?.dbStatus === "Healthy";
  const memPercent = getMemoryUsagePercent();

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600 animate-pulse" />
            System Health Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time operational metrics and diagnostic server status.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow hover:shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Update Now
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Main Operational Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Users Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                    {data.metrics.activeUsers.total}
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Students</span>
                  <span className="font-semibold">{data.metrics.activeUsers.breakdown.students}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Teachers</span>
                  <span className="font-semibold">{data.metrics.activeUsers.breakdown.teachers}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>HODs</span>
                  <span className="font-semibold">{data.metrics.activeUsers.breakdown.hods}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Parents</span>
                  <span className="font-semibold">{data.metrics.activeUsers.breakdown.parents}</span>
                </div>
              </div>
            </div>

            {/* Pending Actions Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Actions</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                    {data.metrics.pendingActions.total}
                  </h3>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 rounded-lg">
                  <Activity className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Leaves</span>
                  <span className="font-semibold">{data.metrics.pendingActions.breakdown.leaves}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Bookings</span>
                  <span className="font-semibold">{data.metrics.pendingActions.breakdown.bookings}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Scholarships</span>
                  <span className="font-semibold">{data.metrics.pendingActions.breakdown.scholarships}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Exam Forms</span>
                  <span className="font-semibold">{data.metrics.pendingActions.breakdown.examForms}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Complaints</span>
                  <span className="font-semibold">{data.metrics.pendingActions.breakdown.complaints}</span>
                </div>
              </div>
            </div>

            {/* Archived Records Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Archived Records</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                    {data.metrics.archivedRecords.total}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 rounded-lg">
                  <Archive className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Total users currently marked as disabled or archived in the directory.
              </div>
            </div>
          </div>

          {/* System Telemetry & Server Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database & Server Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-500" />
                Database & Connection Status
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">DB Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isDbHealthy ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                    <span className={`w-2 h-2 rounded-full ${isDbHealthy ? "bg-green-600 animate-pulse" : "bg-red-600"}`} />
                    {data.system.dbStatus}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Uptime</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    {formatUptime(seconds)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Platform</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 capitalize">
                      {data.system.platform}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Node version</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {data.system.nodeVersion}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Memory Diagnostics */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-gray-500" />
                Server Memory Footprint
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">Heap Utilization</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{memPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${memPercent > 80 ? "bg-red-500" : memPercent > 50 ? "bg-yellow-500" : "bg-blue-600"}`}
                      style={{ width: `${memPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Heap Used</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{data.system.memory.heapUsed} MB</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Heap Total</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{data.system.memory.heapTotal} MB</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-2">
                    <span className="text-gray-600 dark:text-gray-400">Resident Set Size (RSS)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{data.system.memory.rss} MB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
