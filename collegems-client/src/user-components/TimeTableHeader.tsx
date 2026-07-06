export default function TimeTableHeader() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Timetable Management
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Create and manage class schedules
        </p>
      </div>

      <button className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 transition-colors">
        + New Schedule
      </button>
    </div>
  );
}