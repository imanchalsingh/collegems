import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
  AreaChart, Area,
  RadialBarChart, RadialBar
} from "recharts";

export default function StudentAttendance() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  useEffect(() => {
    fetchAttendanceData();
  }, [timeRange]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/attendance/me");
      setAttendanceData(res.data);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const processAttendanceData = () => {
    if (!attendanceData.length) return {};

    // Filter by subject if selected
    let filteredData = attendanceData;
    if (selectedSubject !== "all") {
      filteredData = attendanceData.filter(item => item.subject === selectedSubject);
    }

    // Process for Pie Chart (Overall attendance)
    const presentCount = filteredData.filter(a => a.status === "present").length;
    const absentCount = filteredData.filter(a => a.status === "absent").length;
    const pieData = [
      { name: "Present", value: presentCount, color: "#10b981" },
      { name: "Absent", value: absentCount, color: "#ef4444" },
    ];

    // Process for Bar Chart (Attendance by subject)
    const subjects = [...new Set(filteredData.map(a => a.subject))];
    const barData = subjects.map(subject => {
      const subjectData = filteredData.filter(a => a.subject === subject);
      const present = subjectData.filter(a => a.status === "present").length;
      const total = subjectData.length;
      return {
        subject,
        present,
        absent: total - present,
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0
      };
    });

    // Process for Line Chart (Attendance trend)
    const monthlyData = filteredData.reduce((acc, curr) => {
      const month = new Date(curr.date).toLocaleDateString('en-US', { month: 'short' });
      if (!acc[month]) acc[month] = { present: 0, total: 0 };
      if (curr.status === "present") acc[month].present++;
      acc[month].total++;
      return acc;
    }, {});

    const lineData = Object.entries(monthlyData).map(([month, data]: any) => ({
      month,
      attendance: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      classes: data.total
    }));

    // Process for Area Chart (Daily attendance)
    const dailyData = filteredData.slice(-15).map((a, i) => ({
      day: i + 1,
      date: new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' }),
      status: a.status === "present" ? 1 : 0,
      subject: a.subject
    }));

    // Process for Radial Chart
    const attendancePercentage = filteredData.length > 0 
      ? Math.round((presentCount / filteredData.length) * 100)
      : 0;

    const radialData = [
      { name: 'Attendance', value: attendancePercentage, fill: '#0a295e' }
    ];

    return { pieData, barData, lineData, dailyData, radialData, presentCount, absentCount, attendancePercentage };
  };

  const { pieData = [], barData = [], lineData = [], dailyData = [], radialData = [], 
          presentCount = 0, absentCount = 0, attendancePercentage = 0 } = processAttendanceData();

  const subjects = [...new Set(attendanceData.map(a => a.subject))];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Student Attendance Dashboard</h1>
          <p className="text-gray-400">Track and analyze your attendance performance</p>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center space-x-2">
              <span className="text-gray-300">Time Range:</span>
              <select 
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-[#bd2323]"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="semester">This Semester</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-300">Subject:</span>
              <select 
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-[#bd2323]"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={fetchAttendanceData}
              className="px-4 py-2 bg-linear-to-r from-[#bd2323] to-[#0a295e] rounded-lg hover:opacity-90 transition-opacity flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#10b981]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Present Classes</p>
                <p className="text-3xl font-bold mt-2">{presentCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#10b981]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#ef4444]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Absent Classes</p>
                <p className="text-3xl font-bold mt-2">{absentCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ef4444]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#e6c235]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Classes</p>
                <p className="text-3xl font-bold mt-2">{presentCount + absentCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#e6c235]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#e6c235]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#0a295e]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Attendance Rate</p>
                <p className="text-3xl font-bold mt-2">{attendancePercentage}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#0a295e]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0a295e]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Attendance Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Attendance by Subject</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="subject" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                  />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Monthly Attendance Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                    formatter={(value) => [`${value}%`, 'Attendance Rate']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    name="Attendance %" 
                    stroke="#e6c235" 
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="classes" 
                    name="Classes Held" 
                    stroke="#0a295e" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Daily Attendance (Last 15 Days)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="status" 
                    name="Present (1=Yes)" 
                    stroke="#bd2323" 
                    fill="#bd2323" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Radial Chart */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Overall Attendance Percentage</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                innerRadius="10%" 
                outerRadius="80%" 
                data={radialData} 
                startAngle={180} 
                endAngle={0}
              >
                <RadialBar 
                  minAngle={15} 
                  label={{ fill: '#ffffff', position: 'insideStart' }} 
                  background 
                  dataKey="value" 
                />
                <Legend 
                  iconSize={10} 
                  layout="vertical" 
                  verticalAlign="middle" 
                  wrapperStyle={{ right: 20 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: 'white' }}
                  formatter={(value) => [`${value}%`, 'Attendance']}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Attendance List */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Detailed Attendance Records</h3>
            <span className="text-gray-400">
              Total Records: {attendanceData.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#bd2323]"></div>
              <p className="mt-2 text-gray-400">Loading attendance data...</p>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-gray-400">No attendance records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Subject</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.slice(0, 10).map((record, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">{record.subject || "N/A"}</td>
                      <td className="py-3 px-4">
                        {record.time || new Date(record.date).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          record.status === "present" 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {record.status === "present" ? (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{record.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {attendanceData.length > 10 && (
                <div className="text-center mt-4">
                  <button className="text-[#e6c235] hover:text-[#bd2323] transition-colors">
                    View All Records ({attendanceData.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}