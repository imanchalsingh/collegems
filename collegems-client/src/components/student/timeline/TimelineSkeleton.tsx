import React from "react";

export const TimelineSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="relative pl-8 sm:pl-10 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800 last:before:hidden"
        >
          {/* Skeleton Dot Indicator */}
          <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse border-4 border-gray-50 dark:border-gray-950 flex items-center justify-center" />

          {/* Skeleton Card Body */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-150 dark:border-gray-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-gray-100 dark:bg-gray-850 rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-20 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="h-4 bg-gray-100 dark:bg-gray-850 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-100 dark:bg-gray-850 rounded w-5/6 animate-pulse" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 animate-pulse" />
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-28 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default TimelineSkeleton;
