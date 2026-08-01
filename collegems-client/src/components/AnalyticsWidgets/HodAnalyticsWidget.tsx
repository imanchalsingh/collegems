import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BarChartWidget from '../Charts/BarChartWidget';
import { getAcademicLabel } from "../../utils/academicLabels";
import { useAcademicLabels } from "../../hooks/useAcademicLabels";

const HodAnalyticsWidget: React.FC = () => {
  const { data: academicLabels } = useAcademicLabels();
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Using the existing endpoint, we might want to enhance it later
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/analytics/department/hod-dashboard`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                setData(response.data.data);
            } catch (error) {
                console.error("Failed to fetch HOD analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) return <div>Loading department analytics...</div>;
    if (!data) return <div>No analytics data available.</div>;

    // Dummy data for visual representation until backend is fully extended
    const coursePerformanceData = [
        { course: 'CS101', passRate: 85 },
        { course: 'MA201', passRate: 70 },
        { course: 'PH301', passRate: 90 },
        { course: 'EE401', passRate: 65 },
    ];

    return (
        <div className="space-y-6 mt-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{getAcademicLabel("department", academicLabels)} Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total Enrollment</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.totalEnrollment || 0)}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total {getAcademicLabel("course", academicLabels)}s</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.totalCourses || 0)}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Average Attendance</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.averageAttendance || 0)}%</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Active {getAcademicLabel("faculty", academicLabels)}</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.activeFaculty || 0)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 mt-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{getAcademicLabel("course", academicLabels)} Performance Comparison</h3>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition">
                            Export Report (PDF)
                        </button>
                    </div>
                    <BarChartWidget data={coursePerformanceData} xDataKey="course" barDataKey="passRate" color="#8b5cf6" />
                </div>
            </div>
        </div>
    );
};

export default HodAnalyticsWidget;
