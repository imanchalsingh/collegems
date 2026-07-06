import React, { useState, useEffect } from "react";
import api from "../api/axios";
import AdvancedExportButton from "../common-components-management/AdvancedExportButton";

interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  semester: number;
  course: string;
  department: string;
}

interface AnalyticsData {
  _id: string;
  studentId: Student;
  dropoutRiskScore: number;
  riskLevel: string;
  predictedPerformance: string;
  recommendedInterventions: string[];
  lastCalculatedAt: string;
}

const getFreshness = (lastCalculatedAt?: string) => {
  if (!lastCalculatedAt) {
    return { isStale: true, relativeTime: "Never" };
  }
  const date = new Date(lastCalculatedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  // Consider stale if older than 24 hours (86400000 ms)
  const isStale = diffMs > 24 * 60 * 60 * 1000;

  let relativeTime = "";
  if (diffMins < 1) relativeTime = "Just now";
  else if (diffMins < 60) relativeTime = `${diffMins}m ago`;
  else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
  else relativeTime = `${diffDays}d ago`;

  return { isStale, relativeTime };
};

export default function RiskDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [riskLevel, setRiskLevel] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (riskLevel) params.append("riskLevel", riskLevel);
      if (course) params.append("course", course);
      if (semester) params.append("semester", semester);

      const res = await api.get(`/analytics/dashboard?${params.toString()}`);
      if (res.data.success) {
        setAnalytics(res.data.data);
      } else {
        setError(res.data.message || "Failed to fetch analytics");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    try {
      const res = await api.post("/analytics/batch");
      alert(res.data.message || "Batch analytics generation started.");
      fetchAnalytics(); // Refresh data after batch prediction
    } catch (err: any) {
      alert("Failed to start batch analytics generation: " + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [riskLevel, course, semester]);

  const exportHeaders = ["Student Name", "ID", "Course", "Semester", "Risk Level", "Risk Score (%)", "Predicted Grade", "Interventions"];
  const exportMapper = (row: AnalyticsData) => [
    row.studentId?.name || "N/A",
    row.studentId?.studentId || "N/A",
    row.studentId?.course || "N/A",
    row.studentId?.semester?.toString() || "N/A",
    row.riskLevel.toUpperCase(),
    (row.dropoutRiskScore * 100).toFixed(1),
    row.predictedPerformance,
    row.recommendedInterventions?.join("; ") || "None"
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Predictive Analytics Dashboard</h1>
        <div className="flex gap-3 flex-wrap">
          
          <AdvancedExportButton 
            data={analytics}
            filename="Predictive_Analytics_Report"
            pdfTitle="Predictive Analytics Report"
            pdfMetadata={`Filters applied - Risk: ${riskLevel || "All"}, Course: ${course || "All"}, Semester: ${semester || "All"}`}
            headers={exportHeaders}
            dataMapper={exportMapper}
          />

          <button
            onClick={handleBatchGenerate}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
          >
            Run Batch Predictions
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6 print:hidden">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
            <select
              className="w-full border p-2 rounded"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
            >
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <input
              type="text"
              placeholder="e.g. B.Tech"
              className="w-full border p-2 rounded"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <input
              type="number"
              placeholder="e.g. 3"
              className="w-full border p-2 rounded"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4 print:hidden">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 print:hidden">Loading analytics...</div>
      ) : (
        <div id="exportable-table" className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 bg-gray-50 border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Student Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600">ID</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Course / Sem</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Risk Level</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Risk Score</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Predicted Grade</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Last Updated</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Interventions</th>
              </tr>
            </thead>
            <tbody>
              {analytics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No analytics data found for the selected filters.
                  </td>
                </tr>
              ) : (
                analytics.map((row) => {
                  const { isStale, relativeTime } = getFreshness(row.lastCalculatedAt);
                  return (
                    <tr 
                      key={row._id} 
                      className={`border-b hover:bg-gray-50 transition-colors ${
                        isStale 
                          ? "bg-amber-50/30 hover:bg-amber-50/50 dark:bg-amber-950/5 dark:hover:bg-amber-950/10" 
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4">{row.studentId?.name || "N/A"}</td>
                      <td className="px-6 py-4">{row.studentId?.studentId || "N/A"}</td>
                      <td className="px-6 py-4">
                        {row.studentId?.course || "N/A"} / {row.studentId?.semester || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                            row.riskLevel === "high"
                              ? "bg-red-100 text-red-800"
                              : row.riskLevel === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {row.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">{(row.dropoutRiskScore * 100).toFixed(1)}%</td>
                      <td className="px-6 py-4 font-bold">{row.predictedPerformance}</td>
                      <td className="px-6 py-4">
                        <span 
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isStale 
                              ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" 
                              : "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          }`}
                          title={`Last calculated: ${row.lastCalculatedAt ? new Date(row.lastCalculatedAt).toLocaleString() : "Never"}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isStale ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
                          {isStale ? `Outdated (${relativeTime})` : `Fresh (${relativeTime})`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-normal min-w-[200px]">
                        {row.recommendedInterventions && row.recommendedInterventions.length > 0 ? (
                          <ul className="list-disc pl-4 text-xs space-y-1 text-gray-700">
                            {row.recommendedInterventions.map((intervention, idx) => (
                              <li key={idx}>{intervention}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
