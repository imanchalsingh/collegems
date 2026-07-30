import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getAcademicLabel } from "../../utils/academicLabels";
import { useAcademicLabels } from "../../hooks/useAcademicLabels";

interface TeacherAnalyticsData {
  message?: string;
  totalCoursesTaught: number;
  averageMarks: number;
  lowMarksStudentsCount: number;
  passCount: number;
  failCount: number;
}

const TeacherAnalyticsWidget: React.FC = () => {
  const { data: academicLabels } = useAcademicLabels();
    const [data, setData] = useState<TeacherAnalyticsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/analytics/teacher/dashboard`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                setData(response.data.data);
            } catch (error) {
                console.error("Failed to fetch teacher analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) return <div>Loading class analytics...</div>;
    if (!data || data.message) return <div>{data?.message || "No analytics data available."}</div>;

    const pieData = [
        { name: 'Passed', value: data.passCount },
        { name: 'Failed', value: data.failCount },
    ];
    const COLORS = ['#10b981', '#ef4444'];

    return (
        <div className="space-y-6 mt-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Class Performance Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total {getAcademicLabel("course", academicLabels)}s</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.totalCoursesTaught || 0)}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Class Average Marks</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.averageMarks || 0)}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-red-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">At-Risk {getAcademicLabel("student", academicLabels)}s</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.lowMarksStudentsCount || 0)}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total Passed</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{String(data.passCount || 0)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Pass/Fail Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) =>`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#333', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default TeacherAnalyticsWidget;
