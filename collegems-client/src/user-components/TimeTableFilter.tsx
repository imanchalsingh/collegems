import { getAcademicLabel } from "../utils/academicLabels";
import { useAcademicLabels } from "../hooks/useAcademicLabels";


export default function TimetableFilters() {
  const { data: academicLabels } = useAcademicLabels();
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="timetable-semester" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {getAcademicLabel("semester", academicLabels)}
          </label>
          <select id="timetable-semester" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Select {getAcademicLabel("semester", academicLabels)}</option>
            <option>1-1</option>
            <option>1-2</option>
            <option>2-1</option>
            <option>2-2</option>
            <option>3-1</option>
            <option>3-2</option>
            <option>4-1</option>
            <option>4-2</option>
          </select>
        </div>

        <div>
          <label htmlFor="timetable-department" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {getAcademicLabel("department", academicLabels)}
          </label>
          <select id="timetable-department" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Select {getAcademicLabel("department", academicLabels)}</option>
            <option>CSE</option>
            <option>ECE</option>
            <option>EEE</option>
            <option>MECH</option>
          </select>
        </div>

        <div>
          <label htmlFor="timetable-section" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {getAcademicLabel("section", academicLabels)}
          </label>
          <select id="timetable-section" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Select {getAcademicLabel("section", academicLabels)}</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </select>
        </div>
      </div>
    </>
  );
}
