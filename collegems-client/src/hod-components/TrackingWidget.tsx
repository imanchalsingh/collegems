import { useCallback, useState } from "react";
import { Eye, RotateCcw, User, BookOpen, Building2, Loader2, AlertCircle } from "lucide-react";
import api from "../api/axios";
import { useTrackingStats } from "../hooks/useTrackingStats";
import type { TrackedEntity } from "../hooks/useTrackingStats";

const ENTITY_ICONS: Record<string, React.ElementType> = {
  students: User,
  courses: BookOpen,
  departments: Building2,
};

const ENTITY_COLORS: Record<string, string> = {
  students: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  courses: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  departments: "text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400",
};

const ENTITY_LABELS: Record<string, string> = {
  students: "Students",
  courses: "Courses",
  departments: "Departments",
};

function EntityList({ items, type }: { items: TrackedEntity[]; type: string }) {
  const Icon = ENTITY_ICONS[type] || Eye;
  const colorClass = ENTITY_COLORS[type] || "text-gray-600 bg-gray-50";

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
        No data yet. Views will appear here once entities are accessed.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const displayName =
          item.entity?.name ||
          item.entity?.code ||
          item.entity?.email ||
          `${type.slice(0, -1)} ${item.entityId.slice(-6)}`;
        const subtitle = item.entity?.studentId || item.entity?.department || item.entity?.email || "";

        return (
          <li
            key={item._id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className={`p-1.5 rounded-md ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {displayName}
                </p>
                {subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-3 shrink-0">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {item.count}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function TrackingWidget() {
  const { data, loading, error, refetch } = useTrackingStats();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleReset = useCallback(async () => {
    if (!window.confirm("Reset all view tracking data? This cannot be undone.")) return;
    try {
      setResetting(true);
      setResetError(null);
      await api.post("/tracking/reset", {});
      refetch();
    } catch {
      setResetError("Failed to reset — insufficient permissions or server error.");
    } finally {
      setResetting(false);
    }
  }, [refetch]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-900/30 p-6">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Failed to load analytics</p>
        </div>
      </div>
    );
  }

  const categories = data
    ? Object.entries(data).filter(([, items]) => items.length > 0)
    : [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Most Viewed</h3>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
          Reset
        </button>
      </div>

      <div className="p-5">
        {resetError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
            {resetError}
          </div>
        )}
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            No tracking data yet.
          </p>
        ) : (
          <div className="space-y-6">
            {categories.map(([type, items]) => (
              <div key={type}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  {ENTITY_LABELS[type] || type}
                </h4>
                <EntityList items={items as TrackedEntity[]} type={type} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

