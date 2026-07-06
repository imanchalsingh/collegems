import React, { useEffect, useState } from "react";
import { AlertCircle, FileText, CheckCircle, Clock, Activity, BarChart3, HelpCircle } from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface DropOff {
  field: string;
  count: number;
}

interface FormStat {
  formId: string;
  totalStarted: number;
  completed: number;
  abandoned: number;
  inProgress: number;
  completionRate: number;
  abandonmentRate: number;
  commonDropOffs: DropOff[];
}

const FormAbandonmentStats: React.FC = () => {
  const [stats, setStats] = useState<FormStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d"); // "7d", "30d", "all"

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      let query = "";
      if (timeRange !== "all") {
        const end = new Date();
        const start = new Date();
        if (timeRange === "7d") start.setDate(start.getDate() - 7);
        if (timeRange === "30d") start.setDate(start.getDate() - 30);
        
        query = `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }

      const res = await api.get(`/abandonment/stats${query}`);
      setStats(extractArray(res.data));
    } catch (error) {
      console.error("Failed to fetch form abandonment stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFormId = (id: string) => {
    return id.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" />
            Form Abandonment Insights
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track user drop-offs and optimize form completion rates.
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-rose-500 border-t-transparent" />
          <p className="mt-2 text-sm text-gray-500">Compiling insights...</p>
        </div>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-500">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <p className="text-lg font-medium text-gray-900">No data available</p>
          <p className="text-sm">There are no tracked form sessions in this time range.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {stats.map((stat) => (
            <div key={stat.formId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  {formatFormId(stat.formId)}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${stat.abandonmentRate > 40 ? 'bg-rose-100 text-rose-700' : stat.abandonmentRate > 20 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {stat.abandonmentRate.toFixed(1)}% Abandoned
                </span>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Total Started</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.totalStarted}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium uppercase mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Completed</p>
                    <p className="text-2xl font-bold text-emerald-700">{stat.completed}</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-xs text-rose-600 font-medium uppercase mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Abandoned</p>
                    <p className="text-2xl font-bold text-rose-700">{stat.abandoned}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> In Progress</p>
                    <p className="text-2xl font-bold text-blue-700">{stat.inProgress}</p>
                  </div>
                </div>

                {stat.abandoned > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-gray-400" /> Top Drop-Off Points
                    </h4>
                    <div className="space-y-3">
                      {stat.commonDropOffs.slice(0, 3).map((drop, idx) => (
                        <div key={idx} className="flex items-center">
                          <div className="w-32 truncate text-sm font-medium text-gray-700">
                            {drop.field === "Started, no fields" ? "No interaction" : drop.field}
                          </div>
                          <div className="flex-1 ml-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-rose-400 rounded-full" 
                              style={{ width: `${(drop.count / stat.abandoned) * 100}%` }}
                            />
                          </div>
                          <div className="w-16 text-right text-xs text-gray-500 ml-4 font-mono">
                            {drop.count} ({Math.round((drop.count / stat.abandoned) * 100)}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormAbandonmentStats;
