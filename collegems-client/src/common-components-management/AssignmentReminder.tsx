
// ─── FILE: collegems-client/src/common-components-management/AssignmentReminder.tsx
// Place this file in the common-components-management folder (same level as
// AcademicCalendar.tsx, Library.tsx, Students.tsx).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Bell,
  RefreshCw,
} from "lucide-react";
import api from "../api/axios";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssignmentStatus = "overdue" | "dueToday" | "upcoming" | "submitted";

interface ReminderAssignment {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  totalPoints?: number;
  submissionType: string;
  status: AssignmentStatus;
  submittedAt?: string;
  marks?: number;
  course?: { name: string; code: string };
  teacher?: { name: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysLabel(status: AssignmentStatus, dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (status === "submitted") return "Submitted";
  if (status === "overdue") {
    const late = Math.abs(daysLeft);
    return `${late} day${late !== 1 ? "s" : ""} overdue`;
  }
  if (status === "dueToday") return "Due today!";
  if (daysLeft === 1) return "Due tomorrow";
  return `${daysLeft} days left`;
}

// ── Per-status visual config (matches your existing Tailwind classes) ─────────

const STATUS = {
  overdue: {
    label: "Overdue",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    cardBorder: "border-red-200 dark:border-red-800",
    cardBg: "bg-red-50 dark:bg-red-900/20",
    badgeBg: "bg-red-100 dark:bg-red-900/30",
    badgeText: "text-red-700 dark:text-red-300",
    icon: AlertTriangle,
  },
  dueToday: {
    label: "Due Today",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    cardBorder: "border-amber-200 dark:border-amber-800",
    cardBg: "bg-amber-50 dark:bg-amber-900/20",
    badgeBg: "bg-amber-100 dark:bg-amber-900/30",
    badgeText: "text-amber-700 dark:text-amber-300",
    icon: Clock,
  },
  upcoming: {
    label: "Upcoming",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    cardBorder: "border-blue-200 dark:border-blue-800",
    cardBg: "bg-blue-50 dark:bg-blue-900/20",
    badgeBg: "bg-blue-100 dark:bg-blue-900/30",
    badgeText: "text-blue-700 dark:text-blue-300",
    icon: BookOpen,
  },
  submitted: {
    label: "Submitted",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    cardBorder: "border-emerald-200 dark:border-emerald-800",
    cardBg: "bg-emerald-50 dark:bg-emerald-900/20",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle,
  },
};

// ── Assignment card ───────────────────────────────────────────────────────────

function AssignmentCard({ item }: { item: ReminderAssignment }) {
  const cfg = STATUS[item.status];
  const Icon = cfg.icon;
  const label = daysLabel(item.status, item.dueDate);

  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-xl border transition-shadow
        hover:shadow-md cursor-default
        ${cfg.cardBorder} ${cfg.cardBg}
      `}
    >
      {/* Icon */}
      <div
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${cfg.iconBg} ${cfg.iconColor}
        `}
      >     
        <Icon className="w-5 h-5" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
          {item.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {item.course?.code || item.course?.name || "Unknown course"}
          {item.teacher?.name ? ` · ${item.teacher.name}` : ""}
          {" · Due "}
          {formatDate(item.dueDate)}
        </p>
        {item.status === "submitted" && item.marks !== undefined && item.marks !== null && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
            Marks: {item.marks}/{item.totalPoints ?? "?"}
          </p>
        )}
      </div>

      {/* Badge */}
      <span
        className={`
          flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap
          ${cfg.badgeBg} ${cfg.badgeText}
        `}
      >
        {label}
      </span>

      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssignmentReminder() {
  const [assignments, setAssignments] = useState<ReminderAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/assignment/reminders");
      setAssignments(res.data);
    } catch (err: any) {
      console.error("AssignmentReminder fetch error:", err);
      setError("Could not load assignment reminders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const overdueCount = assignments.filter((a) => a.status === "overdue").length;
  const dueTodayCount = assignments.filter((a) => a.status === "dueToday").length;
  const urgentCount = overdueCount + dueTodayCount;

  const visible = showAll ? assignments : assignments.slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Assignment Reminders
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {loading
                ? "Loading…"
                : `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""} need attention`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Urgent badge */}
          {!loading && urgentCount > 0 && (
            <span
              className={`
                flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold
                ${overdueCount > 0
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}
              `}
            >
              <AlertTriangle className="w-3 h-3" />
              {overdueCount > 0
                ? `${overdueCount} overdue`
                : `${dueTodayCount} due today`}
            </span>
          )}

          {/* Refresh button */}
          <button
            onClick={fetchReminders}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Failed to load</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error}</p>
          <button
            onClick={fetchReminders}
            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">All caught up!</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            No upcoming or overdue assignments right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <AssignmentCard key={item._id} item={item} />
          ))}

          {assignments.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="
                w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700
                text-sm font-semibold text-blue-600 dark:text-blue-400
                hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors
                flex items-center justify-center gap-1
              "
            >
              {showAll
                ? "Show less"
                : `View all ${assignments.length} assignments`}
              <ChevronRight
                className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`}
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}