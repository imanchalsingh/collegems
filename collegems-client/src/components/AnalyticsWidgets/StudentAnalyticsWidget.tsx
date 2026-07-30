import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BarChartWidget from '../Charts/BarChartWidget';
import LineChartWidget from '../Charts/LineChartWidget';
import { getAcademicLabel } from "../../utils/academicLabels";
import { useAcademicLabels } from "../../hooks/useAcademicLabels";

interface StudentAnalyticsWidgetProps {
    studentId: string;
}

const StudentAnalyticsWidget: React.FC<StudentAnalyticsWidgetProps> = ({ studentId }) => {
  const { data: academicLabels } = useAcademicLabels();
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/analytics/student/${studentId}/grade-trend`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                setData(response.data.data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            fetchAnalytics();
        }
    }, [studentId]);

    if (loading) return <div>Loading analytics...</div>;
    if (!data) return <div>No analytics data available.</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Academic Progress Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CGPA Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Estimated CGPA</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.cgpa || 0)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Overall percentage: {String(data.overallPercentage || 0)}%</p>
                </div>

                {/* Attendance Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Attendance</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.attendancePercentage || 0)}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 dark:bg-gray-700">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${String(data.attendancePercentage || 0)}%` }}></div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total {getAcademicLabel("subject", academicLabels)}s</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{Array.isArray(data.subjectWiseMarks) ? data.subjectWiseMarks.length : 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{getAcademicLabel("subject", academicLabels)}-wise Marks Comparison</h3>
                    <BarChartWidget data={Array.isArray(data.subjectWiseMarks) ? data.subjectWiseMarks : []} xDataKey="course" barDataKey="total" color="#6366f1" />
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{getAcademicLabel("semester", academicLabels)}-wise Performance</h3>
                    <LineChartWidget data={Array.isArray(data.semesterWisePerformance) ? data.semesterWisePerformance : []} xDataKey="semester" lineDataKey="averageMarks" color="#10b981" />
                </div>
            </div>
        </div>
    );
};

export default StudentAnalyticsWidget;
