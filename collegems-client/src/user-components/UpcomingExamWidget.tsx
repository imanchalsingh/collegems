import React, { useState, useEffect } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import api from "../api/axios";

interface Exam {
  _id: string;
  examName: string;
  course: string;
  examDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  location: string;
}

const UpcomingExamsWidget: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await api.get("/examschedule/all");
      const today = new Date();
      const upcoming = (response.data || [])
        .filter((e: Exam) => new Date(e.examDate) >= today)
        .sort((a: Exam, b: Exam) =>
          new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
        )
        .slice(0, 5);
      setExams(upcoming);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isWithin7Days = (dateStr: string) => {
    const today = new Date();
    const examDate = new Date(dateStr);
    const diff = (examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };

  const isToday = (dateStr: string) => {
    return new Date(dateStr).toDateString() === new Date().toDateString();
  };

  if (loading) return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <p className="text-gray-500 text-sm">Loading exams...</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Upcoming Exams
        </h2>
        <span className="text-sm text-gray-400">
  Use sidebar to view all
</span>
      </div>

      {exams.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming exams 🎉</p>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const urgent = isWithin7Days(exam.examDate);
            const today = isToday(exam.examDate);
            return (
              <div
                key={exam._id}
                className={`p-4 rounded-lg border ${
                  today
                    ? "border-red-300 bg-red-50 dark:bg-red-900/20"
                    : urgent
                    ? "border-orange-300 bg-orange-50 dark:bg-orange-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {exam.examName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {exam.course}
                    </p>
                  </div>
                  {urgent && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      today
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {today ? "Today!" : "Within 7 days"}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(exam.examDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric"
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {exam.startTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {exam.venue}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingExamsWidget;