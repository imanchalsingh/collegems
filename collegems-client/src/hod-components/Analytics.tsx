import React, { useEffect, useState } from "react";
import { AlertTriangle, Activity } from "lucide-react";
import api from "../api/axios";

interface AtRiskStudent {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
    studentId: string;
    course: string;
    semester: string;
  };
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

  // Consider stale if older than 24 hours
  const isStale = diffMs > 24 * 60 * 60 * 1000;

  let relativeTime = "";
  if (diffMins < 1) relativeTime = "Just now";
  else if (diffMins < 60) relativeTime = `${diffMins}m ago`;
  else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
  else relativeTime = `${diffDays}d ago`;

  return { isStale, relativeTime };
};

export default function HODAnalytics() {
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get("/analytics/department/at-risk");
      if (res.data.success) {
        setAtRiskStudents(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  };

  const assignMentor = async (studentId: string) => {
    try {
      // Basic mock assignment for now, integrate with mentorship API
      await api.post("/mentorships/assign", { menteeId: studentId });
      alert("Mentor assigned successfully.");
    } catch (error) {
      console.error("Failed to assign mentor", error);
      alert("Failed to assign mentor. Check console.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 rounded-lg mr-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">High Risk Students</p>
              <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">{atRiskStudents.length}</h3>
            </div>
         </div>
         {/* More summary widgets can go here */}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> AI Performance Predictions
          </h2>
        </div>
        
        {atRiskStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No high-risk students detected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risk Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Predicted Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Calculated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recommended Interventions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {atRiskStudents.map((record) => {
                  const { isStale, relativeTime } = getFreshness(record.lastCalculatedAt);
                  return (
                    <tr 
                      key={record._id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        isStale 
                          ? "bg-amber-50/20 hover:bg-amber-50/40 dark:bg-amber-950/5 dark:hover:bg-amber-950/10" 
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{record.studentId?.name || "Unknown"}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{record.studentId?.studentId || record.studentId?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 max-w-[100px]">
                            <div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${Math.round(record.dropoutRiskScore * 100)}%` }}></div>
                          </div>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {Math.round(record.dropoutRiskScore * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {record.predictedPerformance}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isStale 
                              ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" 
                              : "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          }`}
                          title={`Last calculated: ${record.lastCalculatedAt ? new Date(record.lastCalculatedAt).toLocaleString() : "Never"}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isStale ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
                          {isStale ? `Outdated (${relativeTime})` : `Fresh (${relativeTime})`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                          {record.recommendedInterventions.map((intervention, idx) => (
                            <li key={idx}>{intervention}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => assignMentor(record.studentId._id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Assign Mentor
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
