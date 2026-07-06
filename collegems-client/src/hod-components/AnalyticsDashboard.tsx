import React from "react";
import { useHodAnalytics } from "../hooks/useHodAnalytics";
import { MetricCard } from "./MetricCard";
import { RecentActivityFeed } from "./RecentActivityFeed";

const UsersIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const AcademicCapIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path d="M12 14l9-5-9-5-9 5 9 5z" />
    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export const AnalyticsDashboard: React.FC = () => {
  const { data, isLoading, isError, error } = useHodAnalytics();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-rose-400 mb-2">Failed to load analytics</h2>
          <p className="text-slate-400">{(error as any)?.message || "An unexpected error occurred."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Department Overview</h1>
        <p className="mt-2 text-slate-400">High-level analytics and performance metrics for your department.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Enrollment"
          value={data?.totalEnrollment || 0}
          icon={<UsersIcon />}
          colorTheme="indigo"
        />
        <MetricCard
          title="Active Faculty"
          value={data?.activeFaculty || 0}
          icon={<AcademicCapIcon />}
          colorTheme="emerald"
        />
        <MetricCard
          title="Total Courses"
          value={data?.totalCourses || 0}
          icon={<BookOpenIcon />}
          colorTheme="amber"
        />
        <MetricCard
          title="Avg. Attendance"
          value={`${data?.averageAttendance || 0}%`}
          icon={<ChartBarIcon />}
          colorTheme="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Placeholder for future charting (e.g., Recharts) */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-full flex flex-col items-center justify-center min-h-[300px] backdrop-blur-md">
             <ChartBarIcon />
             <p className="mt-4 text-slate-400">Detailed interactive charts coming in future update</p>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <RecentActivityFeed activities={data?.recentActivity || []} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
