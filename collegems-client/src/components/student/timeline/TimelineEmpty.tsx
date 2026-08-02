import React from "react";
import { ClipboardList } from "lucide-react";

interface TimelineEmptyProps {
  onClearFilters?: () => void;
}

export const TimelineEmpty: React.FC<TimelineEmptyProps> = ({ onClearFilters }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm text-center">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500 mb-4">
        <ClipboardList className="w-12 h-12" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Milestones Found</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        We couldn't find any academic milestones matching your criteria. Try adjusting or clearing your filters.
      </p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};
export default TimelineEmpty;
