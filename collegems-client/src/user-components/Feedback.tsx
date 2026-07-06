// FILE: collegems-client/src/user-components/Feedback.tsx
// Fixes:
// 1. Renamed internal fetch fn to loadFeedback (avoid collision with browser fetch)
// 2. Added console.error so you can see exact API errors in browser DevTools
// 3. Error message now shown in UI when My Submissions fails to load
// 4. Added dark mode support

import { useEffect, useState } from "react";
import {
  MessageSquare, Star, Send, Clock, CheckCircle,
  AlertCircle, ChevronDown, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";

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
  course?: { name: string; code: string };
  teacher?: { name: string };
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<Category, string> = {
  course:   "Course",
  faculty:  "Faculty / Teacher",
  facility: "Campus Facility",
  general:  "General",
};

const STATUS_CONFIG: Record<Status, { label: string; cls: string; icon: any }> = {
  pending:  { label: "Pending",  cls: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300", icon: Clock },
  reviewed: { label: "Reviewed", cls: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300", icon: Eye },
  resolved: { label: "Resolved", cls: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300", icon: CheckCircle },
};

// ── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Feedback Form ─────────────────────────────────────────────────────────────

function FeedbackForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [form, setForm] = useState({
    category: "general" as Category,
    title: "",
    message: "",
    rating: 0,
    isAnonymous: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setError("Please fill in the title and message.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/feedback", {
        category:    form.category,
        title:       form.title,
        message:     form.message,
        rating:      form.rating || null,
        isAnonymous: form.isAnonymous,
      });
      setSuccess(true);
      setForm({ category: "general", title: "", message: "", rating: 0, isAnonymous: false });
      setTimeout(() => {
        setSuccess(false);
        onSubmitted();
      }, 1500);
    } catch (err: any) {
      console.error("Feedback submit error:", err?.response?.data || err);
      setError(err?.response?.data?.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Submit Feedback
      </h2>

      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> Feedback submitted! Switching to your submissions…
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Category */}
        <div>
          <label htmlFor="feedback-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <div className="relative">
            <select
              id="feedback-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm appearance-none
                focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-8"
            >
              {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="feedback-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input
            id="feedback-title"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Short summary of your feedback"
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Message */}
        <div>
          <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
          <textarea
            id="feedback-message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Describe your feedback in detail..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </label>
          <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <button
            type="button"
            onClick={() => setForm({ ...form, isAnonymous: !form.isAnonymous })}
            className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none ${
              form.isAnonymous ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.isAnonymous ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            {form.isAnonymous
              ? <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              : <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {form.isAnonymous ? "Submitting anonymously" : "Submit with your name"}
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            {form.isAnonymous
              ? "Your name will be hidden from HOD."
              : "Your name will be visible to HOD."}
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold
            hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting…</>
            : <><Send className="w-4 h-4" /> Submit Feedback</>}
        </button>
      </div>
    </div>
  );
}

// ── Feedback History ───────────────────────────────────────────────────────────

function FeedbackHistory({ onSwitchToForm }: { onSwitchToForm?: () => void }) {
  const [items, setItems]     = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const loadFeedback = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/feedback/my");
      console.log("My feedback response:", res.data);
      setItems(res.data);
    } catch (err: any) {
      console.error("Load feedback error:", err?.response?.data || err);
      setError(err?.response?.data?.message || "Failed to load your submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-800 p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 dark:text-red-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900 dark:text-white">Failed to load submissions</p>
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
        <button
          onClick={loadFeedback}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-7 h-7 text-blue-600" />}
        title="No feedback submitted yet"
        description="Your submissions will appear here after you submit feedback."
        actionLabel="Submit Feedback"
        onAction={onSwitchToForm}
        actionHint="Switches to the feedback submission form."
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const cfg = STATUS_CONFIG[item.status];
        const StatusIcon = cfg.icon;
        return (
          <div key={item._id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {CATEGORY_LABELS[item.category]}
                  {item.course && ` · ${item.course.code} — ${item.course.name}`}
                  {" · "}
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                  {item.isAnonymous && " · Anonymous"}
                </p>
              </div>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${cfg.cls}`}>
                <StatusIcon className="w-3 h-3" /> {cfg.label}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.message}</p>

            {item.rating && (
              <div className="flex gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-3.5 h-3.5 ${
                    s <= item.rating! ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"
                  }`} />
                ))}
              </div>
            )}

            {item.adminResponse && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">HOD Response</p>
                <p className="text-xs text-blue-800 dark:text-blue-300">{item.adminResponse}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────

export default function StudentFeedback() {
  const [view, setView]       = useState<"form" | "history">("form");
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <div className="space-y-6">
      {/* Tab switcher - FIXED */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("form")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === "form"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Submit Feedback
        </button>
        <button
          onClick={() => setView("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === "history"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          My Submissions
        </button>
      </div>

      {view === "form" ? (
        <FeedbackForm
          onSubmitted={() => {
            setHistoryKey((k) => k + 1);
            setView("history");
          }}
        />
      ) : (
        <FeedbackHistory key={historyKey} onSwitchToForm={() => setView("form")} />
      )}
    </div>
  );
}