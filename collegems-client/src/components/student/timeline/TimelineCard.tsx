import React, { memo } from "react";
import { Link } from "react-router-dom";
import { Milestone } from "../../../types/milestone";
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
  ShieldCheck,
  AwardIcon,
  GraduationCap,
  ChevronRight,
  HelpCircle
} from "lucide-react";

interface TimelineCardProps {
  milestone: Milestone;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Registration":
      return UserPlus;
    case "Admission":
      return FileCheck;
    case "Semester":
      return CalendarDays;
    case "Attendance":
      return CalendarCheck;
    case "Assignment":
      return FileText;
    case "Exam":
      return FileSpreadsheet;
    case "Result":
      return Award;
    case "Fees":
      return Wallet;
    case "Leave":
      return PlaneTakeoff;
    case "Certificate":
      return ShieldCheck;
    case "Achievement":
      return AwardIcon;
    case "Graduation":
      return GraduationCap;
    default:
      return HelpCircle;
  }
};

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    case "Upcoming":
      return "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "Missed":
      return "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    default:
      return "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
};

export const TimelineCard: React.FC<TimelineCardProps> = memo(({ milestone }) => {
  const Icon = getCategoryIcon(milestone.category);
  const badgeStyle = getStatusBadgeStyle(milestone.status);
  const eventDate = new Date(milestone.date);

  return (
    <div className="relative pl-8 sm:pl-10 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800 last:before:hidden">
      {/* Node Dot Indicator */}
      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-4 border-blue-500 dark:border-blue-400 shadow-sm flex items-center justify-center transition-transform hover:scale-110 duration-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
      </div>

      {/* Card Content wrapper */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-150 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 group">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            {/* Category Icon */}
            <div className="p-2.5 bg-gray-50 dark:bg-gray-850 rounded-xl text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20 transition-colors">
              <Icon className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {milestone.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {eventDate.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}{" "}
                at{" "}
                {eventDate.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Category Badge */}
            <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-650 dark:text-gray-300 border border-transparent rounded-lg">
              {milestone.category}
            </span>

            {/* Status Chip */}
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border ${badgeStyle}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
              {milestone.status}
            </span>
          </div>
        </div>

        {/* Short description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          {milestone.description}
        </p>

        {/* Action area */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Category: {milestone.category}
          </span>

          <Link
            to={milestone.redirectUrl}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-450 hover:bg-blue-50 dark:hover:bg-blue-950/20 active:bg-blue-100 dark:active:bg-blue-900/30 rounded-xl transition-all"
          >
            <span>View Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
});

TimelineCard.displayName = "TimelineCard";
export default TimelineCard;
