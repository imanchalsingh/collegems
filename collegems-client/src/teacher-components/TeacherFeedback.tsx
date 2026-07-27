import { useEffect, useState } from "react";
import { MessageSquare, Star, AlertCircle, Calendar, BookOpen } from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FeedbackItem {
  _id: string;
  category: string;
  title: string;
  message: string;
  rating?: number;
  isAnonymous: boolean;
  sentiment: string;
  sentimentScore: number;
  keyPhrases?: string[];
  isUrgent?: boolean;
  student?: { name: string; studentId?: string };
  course?: { name: string; code: string };
  createdAt: string;
}

export default function TeacherFeedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetches feedback specifically linked to this logged-in teacher
    const fetchTeacherFeedback = async () => {
      try {
        const res = await api.get("/feedback/teacher");
        setFeedbacks(extractArray(res.data));
      } catch (error) {
        console.error("Error fetching feedback", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherFeedback();
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Positive": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Negative": return "bg-rose-100 text-rose-700 border-rose-200";
      case "Neutral":  return "bg-amber-100 text-amber-700 border-amber-200";
      default:         return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Student Feedback
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            View anonymous and named feedback regarding your courses and teaching.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Feedback Yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            You haven't received any feedback for your courses yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedbacks.map((item) => (
            <div 
              key={item._id} 
              className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${
                item.isUrgent ? 'border-rose-300 bg-rose-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSentimentColor(item.sentiment)}`}>
                    {item.sentiment}
                  </span>
                  {item.category && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200">
                      {item.category}
                    </span>
                  )}
                  {item.isUrgent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white animate-pulse">
                      Critical
                    </span>
                  )}
                </div>
                {item.rating && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`w-3.5 h-3.5 ${s <= item.rating! ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} 
                      />
                    ))}
                  </div>
                )}
              </div>

              <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {item.message}
              </p>

              {item.keyPhrases && item.keyPhrases.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {item.keyPhrases.map((phrase, idx) => (
                    <span key={idx} className="text-[10px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100/50">
                      #{phrase}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between mt-auto pt-3 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {item.course?.name || "General"}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}