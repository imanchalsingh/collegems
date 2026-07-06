import React from "react";
import { ActivityItem } from "../hooks/useHodAnalytics";

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
        <div className="w-16 h-16 mb-4 text-slate-600">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-300">No Recent Activity</h3>
        <p className="mt-1 text-sm text-slate-500">Things are quiet in the department right now.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="px-6 py-5 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-slate-100">Department Activity</h3>
      </div>
      <ul className="divide-y divide-slate-800/50">
        {activities.map((activity) => (
          <li key={activity.id} className="p-6 transition-colors hover:bg-slate-800/30">
            <div className="flex gap-4">
              <div className="mt-1">
                {activity.type === 'Complaint' && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
                {activity.type === 'Assignment' && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">{activity.title}</p>
                <p className="mt-1 text-sm text-slate-400">{activity.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(activity.date).toLocaleDateString(undefined, { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
