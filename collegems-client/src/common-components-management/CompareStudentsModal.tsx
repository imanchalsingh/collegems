import React from 'react';
import { useQueries } from '@tanstack/react-query';
import api from '../api/axios';
import { X, Percent, TrendingUp, GraduationCap } from 'lucide-react';

export interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  course: string;
  semester: number;
  joinedAt: string;
  avatarUrl?: string;
}

interface CompareStudentsModalProps {
  students: Student[];
  onClose: () => void;
}

export default function CompareStudentsModal({ students, onClose }: CompareStudentsModalProps) {
  const fetchSummary = async (id: string) => {
    const res = await api.get(`/users/students/${id}/summary`);
    return res.data;
  };

  const results = useQueries({
    queries: students.map(student => ({
      queryKey: ['studentSummary', student._id],
      queryFn: () => fetchSummary(student._id),
      enabled: !!student._id
    }))
  });

  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);

  if (students.length !== 2) return null;

  const data1 = results[0].data;
  const data2 = results[1].data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Compare Students</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : isError ? (
            <div className="text-center text-red-600 py-12 bg-red-50 rounded-xl">
              Failed to load comparison data. Please try again later.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              {[data1, data2].map((data, idx) => {
                if (!data) return null;
                const s = data.student;
                const otherData = idx === 0 ? data2 : data1;
                
                const isBetterAttendance = data.attendancePercentage !== null && otherData && otherData.attendancePercentage !== null && data.attendancePercentage > otherData.attendancePercentage;
                const isBetterResults = data.averageMarks !== null && otherData && otherData.averageMarks !== null && data.averageMarks > otherData.averageMarks;

                return (
                  <div key={idx} className="space-y-6">
                    {/* Profile Header */}
                    <div className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30">
                       <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                          {s.name ? s.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0,2) : "ST"}
                       </div>
                       <div>
                         <h3 className="font-bold text-lg text-gray-900 dark:text-white">{s.name || "N/A"}</h3>
                         <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{s.studentId}</p>
                       </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-4">
                      {/* Attendance */}
                      <div className={`p-5 rounded-xl border-2 transition-colors ${isBetterAttendance ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-600 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <Percent className="w-4 h-4" />
                          <span>Overall Attendance</span>
                        </div>
                        <p className={`text-4xl font-black ${isBetterAttendance ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                          {data.attendancePercentage !== null ? `${data.attendancePercentage}%` : "No Data"}
                        </p>
                      </div>

                      {/* Results */}
                      <div className={`p-5 rounded-xl border-2 transition-colors ${isBetterResults ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-600 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <TrendingUp className="w-4 h-4" />
                          <span>Average Marks</span>
                        </div>
                        <p className={`text-4xl font-black ${isBetterResults ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                          {data.averageMarks !== null ? `${data.averageMarks}` : "No Data"}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Based on {data.totalExams || 0} published records</p>
                      </div>

                      {/* Enrollment Details */}
                      <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                           <GraduationCap className="w-4 h-4" />
                           <span>Enrollment</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-700 pb-2">
                          <span className="text-gray-500 dark:text-gray-400">Course</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{s.course || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-700 pb-2">
                          <span className="text-gray-500 dark:text-gray-400">Semester</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{s.semester || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Joined</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {s.joinedAt ? new Date(s.joinedAt).toLocaleDateString() : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
