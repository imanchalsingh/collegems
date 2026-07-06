import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarCheck,
  AwardIcon,
  BookOpen,
} from "lucide-react";

export default function SemesterComparison() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComparison();
  }, []);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/dashboard/semester-comparison");
      setData(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load semester comparison",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderTrend = (value: number) => {
    if (value > 0)
      return (
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
          <TrendingUp className="w-4 h-4" /> +{value}
        </span>
      );
    if (value < 0)
      return (
        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-medium">
          <TrendingDown className="w-4 h-4" /> {value}
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium">
        <Minus className="w-4 h-4" /> 0
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Loading semester comparison...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const chartData = [
    {
      metric: "Attendance %",
      previous: data.previous.attendancePercentage,
      current: data.current.attendancePercentage,
    },
    {
      metric: "Avg. Marks",
      previous: data.previous.averageMarks,
      current: data.current.averageMarks,
    },
    {
      metric: "Courses",
      previous: data.previous.enrolledCourses,
      current: data.current.enrolledCourses,
    },
  ];

  const cards = [
    {
      title: "Attendance",
      icon: CalendarCheck,
      current: `${data.current.attendancePercentage}%`,
      diff: data.difference.attendancePercentage,
    },
    {
      title: "Average Marks",
      icon: AwardIcon,
      current: data.current.averageMarks,
      diff: data.difference.averageMarks,
    },
    {
      title: "Enrolled Courses",
      icon: BookOpen,
      current: data.current.enrolledCourses,
      diff: data.difference.enrolledCourses,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Semester {data.previousSemester} vs Semester {data.currentSemester}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Comparing your current semester against the previous one.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {card.title}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {card.current}
                </p>
                {renderTrend(card.diff)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Side-by-Side Comparison
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="metric" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "#111827",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend wrapperStyle={{ color: "#6b7280" }} />
              <Bar
                dataKey="previous"
                name={`Semester ${data.previousSemester}`}
                fill="#9ca3af"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="current"
                name={`Semester ${data.currentSemester}`}
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}