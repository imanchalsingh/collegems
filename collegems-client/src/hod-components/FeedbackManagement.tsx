// FILE: collegems-client/src/hod-components/FeedbackManagement.tsx
// NEW FILE — HOD sees all feedback, analytics, and can respond

import { useEffect, useState } from "react";
import {
  MessageSquare, Star, CheckCircle, Clock, Eye,
  BarChart2, Trash2, Send, RefreshCw, AlertCircle, Filter,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import AdvancedExportButton from "../common-components-management/AdvancedExportButton";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "course" | "faculty" | "facility" | "general";
type Status   = "pending" | "reviewed" | "resolved";

interface FeedbackItem {
  _id: string;
  category: Category;
  title: string;
  message: string;
  rating?: number;
  isAnonymous: boolean;
  status: Status;
  adminResponse?: string;
  sentiment: string;
  sentimentScore: number;
  student?: { name: string; email: string; studentId?: string };
  course?: { name: string; code: string };
  teacher?: { name: string };
  createdAt: string;
}

interface Analytics {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  anonymous: number;
  avgRating: string | null;
  categoryBreakdown: { _id: string; count: number; avgRating: number }[];
  sentimentBreakdown: { _id: string; count: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  course: "Course", faculty: "Faculty", facility: "Facility", general: "General",
};

const STATUS_CONFIG: Record<Status, { label: string; cls: string; icon: any }> = {
  pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-700",     icon: Clock },
  reviewed: { label: "Reviewed", cls: "bg-blue-100 text-blue-700",       icon: Eye },
  resolved: { label: "Resolved", cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
};

// ── Analytics panel ───────────────────────────────────────────────────────────

function AnalyticsPanel() {
  const [data, setData]     = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/feedback/analytics")
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-32 rounded-xl bg-gray-100 animate-pulse mb-6" />;
  if (!data)   return null;

  return (
    <div className="mb-6 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total",    value: data.total,    color: "blue" },
          { label: "Pending",  value: data.pending,  color: "amber" },
          { label: "Reviewed", value: data.reviewed, color: "purple" },
          { label: "Resolved", value: data.resolved, color: "emerald" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown + avg rating + sentiment */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" /> By Category
          </p>
          <div className="space-y-2">
            {data.categoryBreakdown.map((c) => (
              <div key={c._id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                  {CATEGORY_LABELS[c._id] || c._id}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.round((c.count / data.total) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-6 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-600" /> Sentiment Analysis
          </p>
          <div className="space-y-2">
            {data.sentimentBreakdown && data.sentimentBreakdown.map((s) => {
              const colorClass = s._id === 'Positive' ? 'bg-emerald-500' : s._id === 'Negative' ? 'bg-rose-500' : s._id === 'Neutral' ? 'bg-amber-500' : 'bg-gray-400';
              return (
              <div key={s._id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                  {s._id}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`${colorClass} h-2 rounded-full`}
                    style={{ width: `${Math.round((s.count / data.total) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-6 text-right">{s.count}</span>
              </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-center items-center">
          <p className="text-sm font-semibold text-gray-900 mb-2">Average Rating</p>
          {data.avgRating ? (
            <>
              <p className="text-4xl font-bold text-amber-500">{data.avgRating}</p>
              <div className="flex gap-0.5 mt-2">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-5 h-5 ${s <= Math.round(Number(data.avgRating)) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {data.anonymous} anonymous · {data.total - data.anonymous} named
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No ratings yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single feedback card ───────────────────────────────────────────────────────

function FeedbackCard({
  item, onUpdate, onDelete,
}: {
  item: FeedbackItem;
  onUpdate: (id: string, status: Status, response: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [response, setResponse]   = useState(item.adminResponse || "");
  const [status, setStatus]       = useState<Status>(item.status);
  const [saving, setSaving]       = useState(false);

  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Positive": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Negative": return "bg-rose-100 text-rose-700 border-rose-200";
      case "Neutral": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/feedback/${item._id}`, { status, adminResponse: response });
      onUpdate(item._id, status, response);
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              {CATEGORY_LABELS[item.category]}
            </span>
            {item.isAnonymous && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                Anonymous
              </span>
            )}
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded font-bold ${cfg.cls}`}>
              <StatusIcon className="w-3 h-3" /> {cfg.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${getSentimentColor(item.sentiment)}`}>
              {item.sentiment} {item.sentimentScore ? `(${(item.sentimentScore > 0 ? '+' : '')}${item.sentimentScore})` : ''}
            </span>
          </div>
          <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.isAnonymous ? "Anonymous" : item.student?.name || "Unknown"}
            {item.student?.studentId && ` · ${item.student.studentId}`}
            {" · "}
            {new Date(item.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        </div>
        {item.rating && (
          <div className="flex gap-0.5 flex-shrink-0">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className={`w-3.5 h-3.5 ${s <= item.rating! ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">{item.message}</p>

          {/* Status change */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Response box */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Your Response <span className="text-gray-400">(visible to student)</span>
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="Type your response here…"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => onDelete(item._id)}
              className="flex items-center gap-1.5 px-3 py-2 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────

export default function FeedbackManagement() {
  const [items, setItems]         = useState<FeedbackItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"list" | "analytics">("list");
  const [filterCat, setFilterCat] = useState("");
  const [filterSt,  setFilterSt]  = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat) params.append("category", filterCat);
      if (filterSt)  params.append("status",   filterSt);
      const res = await api.get(`/feedback/all?${params.toString()}`);
      setItems(extractArray(res.data));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filterCat, filterSt]);

  const handleUpdate = (id: string, status: Status, adminResponse: string) => {
    setItems((prev) =>
      prev.map((i) => i._id === id ? { ...i, status, adminResponse } : i)
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feedback permanently?")) return;
    try {
      await api.delete(`/feedback/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Feedback Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === "list" ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Feedback
          </button>
          <button
            onClick={() => setView("analytics")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              view === "analytics" ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Analytics
          </button>
        </div>
      </div>

      {view === "analytics" ? (
        <AnalyticsPanel />
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="course">Course</option>
                <option value="faculty">Faculty</option>
                <option value="facility">Facility</option>
                <option value="general">General</option>
              </select>
            </div>
            <select
              value={filterSt}
              onChange={(e) => setFilterSt(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
            <AdvancedExportButton
              data={items}
              filename="Feedback_Export"
              pdfTitle="Student Feedback Report"
              headers={["Category", "Title", "Message", "Status", "Sentiment", "Sentiment Score", "Date"]}
              dataMapper={(item: FeedbackItem) => [
                CATEGORY_LABELS[item.category] || item.category,
                item.title,
                item.message,
                item.status.toUpperCase(),
                item.sentiment || "N/A",
                item.sentimentScore?.toString() || "0",
                new Date(item.createdAt).toLocaleDateString()
              ]}
            />
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No feedback found for the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <FeedbackCard
                  key={item._id}
                  item={item}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
