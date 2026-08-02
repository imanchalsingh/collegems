import React from "react";
import { Search, X, RotateCcw, SortAsc, SortDesc } from "lucide-react";
import { MilestoneCategory, MilestoneStatus } from "../../../types/milestone";

interface TimelineFilterProps {
  search: string;
  setSearch: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  sort: "asc" | "desc";
  setSort: (val: "asc" | "desc") => void;
  onClear: () => void;
}

const CATEGORIES: MilestoneCategory[] = [
  "Admission",
  "Registration",
  "Semester",
  "Attendance",
  "Assignment",
  "Exam",
  "Result",
  "Fees",
  "Leave",
  "Certificate",
  "Achievement",
  "Graduation"
];

const STATUSES: MilestoneStatus[] = ["Completed", "Upcoming", "Missed"];

export const TimelineFilter: React.FC<TimelineFilterProps> = ({
  search,
  setSearch,
  category,
  setCategory,
  status,
  setStatus,
  sort,
  setSort,
  onClear
}) => {
  const hasActiveFilters = search || category || status || sort !== "desc";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <label htmlFor="search" className="sr-only">Search timeline</label>
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search"
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 dark:border-gray-700 dark:bg-gray-850 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="sr-only">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 dark:border-gray-700 dark:bg-gray-850 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="sr-only">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 dark:border-gray-700 dark:bg-gray-850 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((stat) => (
              <option key={stat} value={stat}>
                {stat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort and Clear buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setSort(sort === "desc" ? "asc" : "desc")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold border border-gray-250 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
            title={sort === "desc" ? "Sort Oldest first" : "Sort Newest first"}
          >
            {sort === "desc" ? (
              <>
                <SortDesc className="w-4 h-4" />
                <span>Newest</span>
              </>
            ) : (
              <>
                <SortAsc className="w-4 h-4" />
                <span>Oldest</span>
              </>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl transition-all"
              title="Clear all filters"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="sr-only">Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default TimelineFilter;
