import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { getRecentHistory } from "../api/history";

export const RecentHistorySection = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await getRecentHistory();
      if (res.success) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch recent history", err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Course": return "📚";
      case "User":
      case "Student":
      case "Faculty": return "👤";
      case "Timetable": return "📅";
      case "Event": return "🎟️";
      case "Assignment": return "📝";
      case "Club": return "🎭";
      case "Announcement": return "📢";
      default: return "📄";
    }
  };

  if (loading) return null;

  if (history.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
      <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
        <span>🕒</span> Recently Viewed
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {history.map((item) => (
          <Link
            key={item._id}
            to={item.url}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="text-2xl">{getIcon(item.entityType)}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={item.displayName}>
                {item.displayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.entityType}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
