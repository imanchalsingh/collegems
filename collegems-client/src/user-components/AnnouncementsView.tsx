// FILE: collegems-client/src/user-components/AnnouncementsView.tsx

import { useEffect, useState } from "react";
import { Bell, AlertCircle, Info, AlertTriangle, Zap, CheckCheck } from "lucide-react";
import api from "../api/axios";

interface Announcement {
  _id: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  targetRole: string;
  targetCourse: string | null;
  targetSemester: string | null;
  expiresAt: string | null;
  createdAt: string;
  postedBy: { name: string; role: string };
  isRead?: boolean;
}

const PRIORITY_CONFIG: Record<
  string,
  { icon: React.ElementType; card: string; badge: string; label: string }
> = {
  low: {
    icon: Info,
    card: "border-gray-200 dark:border-gray-700",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    label: "General",
  },
  medium: {
    icon: Bell,
    card: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    label: "Notice",
  },
  high: {
    icon: AlertTriangle,
    card: "border-yellow-300 dark:border-yellow-700",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    label: "Important",
  },
  urgent: {
    icon: Zap,
    card: "border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-900/10",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    label: "Urgent",
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/announcements/my");
        setAnnouncements(res.data.data || []);
      } catch (err) {
        console.error("Failed to load announcements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

// Mark an announcement as read 
  const handleOpen = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));

    const target = announcements.find((a) => a._id === id);
    if (!target || target.isRead) return;

    setAnnouncements((prev) =>
      prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
    );

    api.post(`/announcements/${id}/read`).catch((err) => {
      console.error("Failed to mark announcement as read:", err);
      
      setAnnouncements((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: false } : a))
      );
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="animate-spin border-4 border-indigo-400 border-t-transparent rounded-full w-10 h-10" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 dark:text-gray-500">
        <Bell className="w-14 h-14 opacity-25" />
        <p className="text-lg font-medium">No announcements right now</p>
        <p className="text-sm">You're all caught up!</p>
      </div>
    );
  }

  // Sort: urgent → high → medium → low, then newest first
  const sorted = [...announcements].sort((a, b) => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    const diff = (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-xl">
          <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Announcements
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {announcements.length} notice{announcements.length !== 1 ? "s" : ""} for you
          </p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {sorted.map((a) => {
          const cfg = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.medium;
          const Icon = cfg.icon;
          const isOpen = expanded === a._id;

          return (
            <button
              key={a._id}
              onClick={() => handleOpen(a._id)}
              className={`w-full text-left bg-white dark:bg-gray-800 rounded-2xl border-2 ${cfg.card} p-4 hover:shadow-md transition-all`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                    {a.targetCourse && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        {a.targetCourse}
                      </span>
                    )}
                    {a.targetSemester && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                        Sem {a.targetSemester}
                      </span>
                    )}
                    {a.isRead ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        <CheckCheck className="w-3 h-3" />
                        Read
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                        Unread
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {a.title}
                  </h3>

                  <p
                    className={`text-sm text-gray-600 dark:text-gray-300 mt-1 ${
                      isOpen ? "" : "line-clamp-2"
                    }`}
                  >
                    {a.message}
                  </p>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {a.postedBy?.name} · {timeAgo(a.createdAt)}
                    {a.expiresAt &&
                      ` · Expires ${new Date(a.expiresAt).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" }
                      )}`}
                  </p>

                  {!isOpen && a.message.length > 120 && (
                    <span className="text-xs text-indigo-500 mt-1 block">
                      Tap to read more
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
