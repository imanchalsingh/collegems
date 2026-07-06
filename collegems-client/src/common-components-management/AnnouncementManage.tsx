// FILE: collegems-client/src/teacher-components/AnnouncementManage.tsx

import { useEffect, useState } from "react";
import {
  Bell,
  Trash2,
  RefreshCw,
  Filter,
  AlertTriangle,
  Send,
  Loader2,
  Edit,
  X,
  Eye,
} from "lucide-react";
import api from "../api/axios";
import AnnouncementForm from "./AnnouncementForm";
import EmptyState from "../components/EmptyState";

interface Announcement {
  _id: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  targetRole: string;
  targetCourse: string | null;
  targetSemester: string | null;
  expiresAt: string | null;
  isActive: boolean;
  status?: "draft" | "published";
  createdAt: string;
  postedBy: { _id: string; name: string; email?: string; role: string };
}

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

interface AnnouncementManageProps {
  refreshKey?: number;
}

export default function AnnouncementManage({ refreshKey }: AnnouncementManageProps = {}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterRole, setFilterRole] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const userStr = localStorage.getItem("userData");
  const userData = userStr ? JSON.parse(userStr) : null;
  const currentUserId = userData?._id || userData?.id;
  const currentUserRole = userData?.role || localStorage.getItem("role");
  const hasActiveFilters = Boolean(filterRole || filterCourse || filterSemester || filterStatus);
  const showPublishCta = !hasActiveFilters;

// inline confirm modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [readCounts, setReadCounts] = useState<Record<string, number>>({});

  const fetchAnnouncements = async () => {
    setLoading(true);

    try {
      const params: Record<string, string> = {};

      if (filterRole) params.targetRole = filterRole;
      if (filterCourse) params.targetCourse = filterCourse;
      if (filterSemester) params.targetSemester = filterSemester;
      if (filterStatus) params.status = filterStatus;

      const res = await api.get("/announcements", { params });
      const list: Announcement[] = res.data.data || [];

      setAnnouncements(list);

      const published = list.filter((a) => a.status !== "draft");
      const results = await Promise.allSettled(
        published.map((a) => api.get(`/announcements/${a._id}/read-stats`))
      );

      setReadCounts((prev) => {
        const next = { ...prev };
        results.forEach((result, i) => {
          if (result.status === "fulfilled") {
            next[published[i]._id] = result.value.data?.data?.totalReaders ?? 0;
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [filterRole, filterCourse, filterSemester, filterStatus, refreshKey]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    setDeletingId(confirmDeleteId);

    try {
      await api.delete(`/announcements/${confirmDeleteId}`);

      setAnnouncements((prev) =>
        prev.filter((a) => a._id !== confirmDeleteId)
      );

      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async (id: string) => {
    setPublishingId(id);
    try {
      await api.put(`/announcements/${id}`, { status: "published" });
      await fetchAnnouncements();
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setPublishingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-2xl">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              All Announcements
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {announcements.length} total
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnnouncements}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="hod">HOD</option>
          <option value="parent">Parents</option>
        </select>

        {/* Course Filter */}
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Courses</option>

          {["BCA", "MCA", "BBA", "MBA"].map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>

        {/* Semester Filter */}
        <select
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Semesters</option>

          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <option key={sem} value={sem}>
              Semester {sem}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="animate-spin border-4 border-indigo-400 border-t-transparent rounded-full w-10 h-10" />
        </div>
      ) : announcements.length === 0 ? (
        showPublishCta ? (
          <EmptyState
            icon={<Bell className="w-7 h-7 text-indigo-600" />}
            title="No notices published yet"
            description="Use the composer above to publish the first notice for your audience."
            actionLabel="Publish Notice"
            onAction={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            actionHint="Jumps to the notice composer at the top of the page."
          />
        ) : (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No announcements found.</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a._id}
              className="bg-white dark:bg-gray-900 rounded-[28px] border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {a.title}
                    </h3>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        PRIORITY_STYLES[a.priority]
                      }`}
                    >
                      {a.priority}
                    </span>

                    {a.status === "draft" && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        Draft
                      </span>
                    )}

                    {!a.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500">
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                    {a.message}
                  </p>

                  {/* Audience Tags */}
                  <div className="flex gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      {a.targetRole === "all"
                        ? "Everyone"
                        : a.targetRole}
                    </span>

                    {a.targetCourse && (
                      <span className="px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        {a.targetCourse}
                      </span>
                    )}

                    {a.targetSemester && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                        Sem {a.targetSemester}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Posted by {a.postedBy?.name} ·{" "}
                    {formatDate(a.createdAt)}
                    {a.expiresAt &&
                      ` · Expires ${formatDate(a.expiresAt)}`}
                  </p>

                  {/* Read tracking */}
                  {a.status !== "draft" && (
                    <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                      <Eye className="w-3.5 h-3.5" />
                      {readCounts[a._id] ?? 0} reader
                      {(readCounts[a._id] ?? 0) === 1 ? "" : "s"}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                {(currentUserRole === "hod" || currentUserRole === "admin" || a.postedBy?._id === currentUserId) && (
                  <div className="flex items-center gap-1 shrink-0">
                    {a.status === "draft" && (
                      <>
                        <button
                          onClick={() => setEditingAnnouncement(a)}
                          className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
                          title="Edit draft"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handlePublish(a._id)}
                          disabled={publishingId === a._id}
                          className="p-2 rounded-xl text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 transition-colors disabled:opacity-50"
                          title="Publish announcement"
                        >
                          {publishingId === a._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setConfirmDeleteId(a._id)}
                      className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Inline Delete Confirmation */}
              {confirmDeleteId === a._id && (
                <div className="mt-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />

                    <div className="flex-1">
                      <h4 className="font-semibold text-red-700 dark:text-red-300">
                        Confirm Deletion
                      </h4>

                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        This announcement will be permanently removed.
                      </p>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={handleDelete}
                          disabled={deletingId === a._id}
                          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {deletingId === a._id
                            ? "Deleting..."
                            : "Delete Announcement"}
                        </button>

                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Draft Announcement</h2>
              <button
                onClick={() => setEditingAnnouncement(null)}
                className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <AnnouncementForm
                mode="edit"
                initialAnnouncement={editingAnnouncement}
                onSuccess={() => {
                  setEditingAnnouncement(null);
                  fetchAnnouncements();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

