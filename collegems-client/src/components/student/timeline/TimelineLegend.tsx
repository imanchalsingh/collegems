import React from "react";
import { MilestoneStatus, MilestoneCategory } from "../../../types/milestone";
import {
  UserPlus,
  FileCheck,
  CalendarDays,
  CalendarCheck,
  FileText,
  FileSpreadsheet,
  Award,
  Wallet,
  PlaneTakeoff,
  AwardIcon,
  ShieldCheck,
  GraduationCap
} from "lucide-react";

export const TimelineLegend: React.FC = () => {
  const statusLegend: { status: MilestoneStatus; color: string; bg: string }[] = [
    { status: "Completed", color: "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { status: "Upcoming", color: "text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { status: "Missed", color: "text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800", bg: "bg-rose-50 dark:bg-rose-950/30" },
  ];

  const categoryLegend: { category: MilestoneCategory; icon: React.ComponentType<{ className?: string }> }[] = [
    { category: "Registration", icon: UserPlus },
    { category: "Admission", icon: FileCheck },
    { category: "Semester", icon: CalendarDays },
    { category: "Attendance", icon: CalendarCheck },
    { category: "Assignment", icon: FileText },
    { category: "Exam", icon: FileSpreadsheet },
    { category: "Result", icon: Award },
    { category: "Fees", icon: Wallet },
    { category: "Leave", icon: PlaneTakeoff },
    { category: "Certificate", icon: ShieldCheck },
    { category: "Achievement", icon: AwardIcon },
    { category: "Graduation", icon: GraduationCap },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-6">
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Status Levels</h4>
        <div className="flex flex-wrap gap-2">
          {statusLegend.map(({ status, color, bg }) => (
            <span
              key={status}
              className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${bg} ${color}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
              {status}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categories & Symbols</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categoryLegend.map(({ category, icon: Icon }) => (
            <div
              key={category}
              className="flex items-center gap-2.5 p-2 bg-gray-50 dark:bg-gray-850 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-gray-500 dark:text-gray-400">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default TimelineLegend;
