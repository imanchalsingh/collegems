import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { AlertTriangle, UserX, Clock, CheckCircle } from "lucide-react";

export default function AttendanceAlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get("/attendance/alerts");
      setAlerts(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch attendance alerts", err);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      await api.patch(`/attendance/alerts/${id}/resolve`);
      setAlerts(alerts.filter(a => a._id !== id));
    } catch (err) {
      console.error("Failed to resolve alert", err);
    }
  };

  if (loading) {
    return <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse h-48" />;
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center">
        <CheckCircle className="w-12 h-12 text-emerald-500 mb-2" />
        <h3 className="font-medium text-gray-900 dark:text-white">All Clear</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No attendance anomalies detected.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/30 overflow-hidden shadow-sm">
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
          <AlertTriangle className="w-5 h-5" />
          Attendance Alerts
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold">
          {alerts.length} Flagged
        </span>
      </div>
      
      <div className="max-h-80 overflow-y-auto p-4 space-y-3">
        {alerts.map(alert => (
          <div key={alert._id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {alert.alertType === "CONSECUTIVE_ABSENCE" ? (
                  <UserX className="w-4 h-4 text-orange-500" />
                ) : (
                  <Clock className="w-4 h-4 text-blue-500" />
                )}
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {alert.student?.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">({alert.student?.studentId})</span>
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                alert.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {alert.severity} Risk
              </span>
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">{alert.description}</p>
            
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                Detected: {new Date(alert.lastDetectedAt).toLocaleDateString()}
              </span>
              <button 
                onClick={() => resolveAlert(alert._id)}
                className="text-xs font-medium px-3 py-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
