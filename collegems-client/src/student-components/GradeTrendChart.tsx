import React, { useState } from "react";
import { useStudentGradeTrend } from "../hooks/useStudentGradeTrend";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartBarIcon } from "lucide-react";

export const GradeTrendChart: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [semester, setSemester] = useState<string>("");
  const [subject, setSubject] = useState<string>("");

  const { data, isLoading, isError, error } = useStudentGradeTrend({
    studentId,
    semester: semester || undefined,
    subject: subject || undefined,
  });

  const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSemester(e.target.value);
  };
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubject(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-slate-800/30 rounded animate-pulse" />
        <div className="h-64 bg-slate-800/30 rounded animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center">
        <h2 className="text-lg font-semibold text-rose-400">Failed to load grade trends</h2>
        <p className="mt-2 text-rose-300">{(error as any)?.message || "An unexpected error occurred."}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <ChartBarIcon className="w-12 h-12 mx-auto mb-4" />
        <p>No grade data available for the selected filters.</p>
      </div>
    );
  }

  // Transform dates for display
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    internal: d.internal,
    external: d.external,
    practical: d.practical,
    total: d.total,
  }));

  return (
    <div className="p-6 bg-slate-900/30 rounded-xl border border-slate-700/50 backdrop-blur-md">
      <h3 className="text-xl font-semibold text-slate-100 mb-4">Grade Trend</h3>
      <div className="flex gap-4 mb-4">
        <select
          value={semester}
          onChange={handleSemesterChange}
          className="rounded bg-slate-800/30 text-slate-200 px-3 py-2 focus:outline-none"
          aria-label="Filter by semester"
        >
          <option value="">All Semesters</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
          <option value="3">Semester 3</option>
          <option value="4">Semester 4</option>
        </select>
        <select
          value={subject}
          onChange={handleSubjectChange}
          className="rounded bg-slate-800/30 text-slate-200 px-3 py-2 focus:outline-none"
          aria-label="Filter by subject"
        >
          <option value="">All Subjects</option>
          {/* In a full implementation these would be fetched dynamically */}
          <option value="CS101">CS101 - Intro to CS</option>
          <option value="CS102">CS102 - Data Structures</option>
          <option value="MA101">MA101 - Calculus</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
          <YAxis stroke="rgba(255,255,255,0.6)" />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none" }} />
          <Legend />
          <Line type="monotone" dataKey="internal" stroke="#34d399" name="Internal" dot={false} />
          <Line type="monotone" dataKey="external" stroke="#60a5fa" name="External" dot={false} />
          <Line type="monotone" dataKey="practical" stroke="#fbbf24" name="Practical" dot={false} />
          <Line type="monotone" dataKey="total" stroke="#fff" name="Total" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
