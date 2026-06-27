import React, { useState, useEffect } from "react";
import api from "../api/axios";
import AdvancedExportButton from "../common-components-management/AdvancedExportButton";

interface SystemLog {
  _id: string;
  level: string;
  message: string;
  correlationId: string;
  service: string;
  meta: any;
  timestamp: string;
}

export default function SystemLogsDashboard() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Filters
  const [level, setLevel] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [service, setService] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (level) params.append("level", level);
      if (correlationId) params.append("correlationId", correlationId);
      if (service) params.append("service", service);

      // Using the auditLog route since it's restricted to HOD
      const res = await api.get(`/audit-logs/system-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.logs);
      } else {
        setError(res.data.message || "Failed to fetch logs");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred fetching logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [level, correlationId, service]);

  const getLevelColor = (lvl: string) => {
    switch (lvl.toLowerCase()) {
      case "error": return "bg-red-100 text-red-800";
      case "warn": return "bg-yellow-100 text-yellow-800";
      case "info": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const exportHeaders = ["Timestamp", "Level", "Service", "Trace/Correlation ID", "Message"];
  const exportMapper = (log: SystemLog) => [
    new Date(log.timestamp).toLocaleString(),
    log.level.toUpperCase(),
    log.service,
    log.correlationId || "N/A",
    log.message
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Distributed System Logs</h1>
        <div className="flex gap-3 flex-wrap">
          <AdvancedExportButton
            data={logs}
            filename="System_Logs_Export"
            pdfTitle="System Observability Traces"
            pdfMetadata={`Filters applied - Level: ${level || "All"}, Service: ${service || "All"}, Trace ID: ${correlationId || "All"}`}
            headers={exportHeaders}
            dataMapper={exportMapper}
          />
          <button
            onClick={fetchLogs}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
          >
            Refresh Logs
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Trace Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Log Level</label>
            <select
              className="w-full border p-2 rounded"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correlation ID (Trace ID)</label>
            <input
              type="text"
              placeholder="e.g. 550e8400-e29b..."
              className="w-full border p-2 rounded"
              value={correlationId}
              onChange={(e) => setCorrelationId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <select
              className="w-full border p-2 rounded"
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">All Services</option>
              <option value="collegems-server">Node API (collegems-server)</option>
              <option value="collegems-ml-service">Python ML (collegems-ml-service)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading system traces...</div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 bg-gray-50 border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600">Timestamp</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Level</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Service</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Trace / Correlation ID</th>
                <th className="px-4 py-3 font-semibold text-gray-600 w-full">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                     No system logs found for the given criteria.
                  </td>
                </tr>
              ) : (
                logs.map((logItem) => (
                  <tr key={logItem._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(logItem.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getLevelColor(logItem.level)}`}>
                        {logItem.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {logItem.service}
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="font-mono text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                        title="Click to filter by this Trace ID"
                        onClick={() => setCorrelationId(logItem.correlationId)}
                      >
                        {logItem.correlationId ? logItem.correlationId.split('-')[0] + '...' : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 truncate max-w-md" title={logItem.message}>
                      {logItem.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
