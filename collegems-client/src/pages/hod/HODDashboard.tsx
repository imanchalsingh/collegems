import { useEffect, useState } from "react";
import api from "../../api/axios";
import HodCourses from "../../components/Courses";
import Students from "../../components/Students";
import Teachers from "../../components/Teachers";
import ExamSchedule from "../../components/ExamSchedule";
import Classes from "../../components/Classes";
import Hodfee from "./Hodfee";
import HODSalary from "./HodSalary";

type TabType =
  | "overview"
  | "teachers"
  | "students"
  | "courses"
  | "classes"
  | "fees"
  | "salary"
  | "examSchedule";

interface Data {
  cards: Array<{
    title: string;
    value: number;
  }>;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalClassess: number;
}

export default function HODDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: "📊" },
    { id: "teachers" as TabType, label: "Teachers", icon: "👨‍🏫" },
    { id: "students" as TabType, label: "Students", icon: "👨‍🎓" },
    { id: "courses" as TabType, label: "Courses", icon: "📚" },
    { id: "classes" as TabType, label: "Classes", icon: "🏫" },
    { id: "fees" as TabType, label: "Fees", icon: "💵" },
    { id: "salary" as TabType, label: "Salary", icon: "🪙" },
    {
      id: "examSchedule" as TabType,
      label: "Exam Schedule",
      icon: "🗓️",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e6c235]"></div>
          <p className="mt-4 text-gray-300">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Failed to load dashboard
          </h3>
          <p className="text-gray-400 mb-4">Unable to fetch dashboard data</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-10 p-6"
        style={{
          background:
            "linear-gradient(135deg, #0a295e 0%, rgba(10, 41, 94, 0.9) 100%)",
          borderBottom: "2px solid #e6c235",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">HOD Dashboard</h1>
              <p className="text-gray-300 mt-1">
                Department Head Management Portal
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-gray-800/50 rounded-lg px-4 py-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-gray-300">Connected</span>
              </div>
              <button
                onClick={fetchDashboardData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-8xl mx-auto px-4 md:px-6 pt-6">
        <div className="flex space-x-1 bg-gray-800/50 rounded-xl p-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Welcome Card */}
              <div className="bg-linear-to-r from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Welcome, HOD!</h2>
                    <p className="text-gray-300">
                      Manage your department efficiently. Monitor teachers,
                      students, and courses from one dashboard.
                    </p>
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-sm text-gray-400">
                        Last updated: Just now
                      </span>
                      <span className="text-sm px-3 py-1 rounded-full bg-green-500/20 text-green-400">
                        All systems operational
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#e6c235] to-[#bd2323] flex items-center justify-center">
                      <span className="text-2xl">🎓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Department Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {data.cards.map((c: any, i: number) => {
                    const colors = [
                      "from-[#bd2323] to-[#ff6b6b]",
                      "from-[#0a295e] to-[#4dabf7]",
                      "from-[#e6c235] to-[#ffd93d]",
                      "from-[#10b981] to-[#34d399]",
                    ];

                    const icons = ["📊", "👥", "📈", "🎯"];

                    return (
                      <div
                        key={i}
                        className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 group hover:scale-[1.02] transition-transform"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-gray-400 text-sm">{c.title}</p>
                            <p className="text-3xl font-bold mt-2">{c.value}</p>
                          </div>
                          <div
                            className={`w-12 h-12 rounded-lg bg-linear-to-br ${colors[i % colors.length]} flex items-center justify-center`}
                          >
                            <span className="text-xl">
                              {icons[i % icons.length]}
                            </span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-700">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">View details</span>
                            <svg
                              className="w-4 h-4 text-gray-400 group-hover:text-[#e6c235] transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Add New Teacher",
                      icon: "👨‍🏫",
                      color: "#0a295e",
                      onClick: () => setActiveTab("teachers"),
                    },
                    {
                      label: "View All Students",
                      icon: "👨‍🎓",
                      color: "#bd2323",
                      onClick: () => setActiveTab("students"),
                    },
                    {
                      label: "Manage Courses",
                      icon: "📚",
                      color: "#e6c235",
                      onClick: () => setActiveTab("courses"),
                    },
                  ].map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors border border-gray-600 hover:border-gray-500"
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${action.color}20` }}
                      >
                        {action.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{action.label}</p>
                        <p className="text-sm text-gray-400">Click to manage</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "teachers" && (
            <div className="space-y-6">
              <Teachers />
            </div>
          )}

          {activeTab === "students" && (
            <div className="space-y-6">
              <Students />
            </div>
          )}
          {activeTab === "fees" && (
            <div className="space-y-6">
              <Hodfee />
            </div>
          )}
          {activeTab === "salary" && (
            <div className="space-y-6">
              <HODSalary />
            </div>
          )}
          {activeTab === "courses" && (
            <div className="space-y-6">
              <HodCourses />
            </div>
          )}
          {activeTab === "examSchedule" && (
            <div className="space-y-6">
              <ExamSchedule />
            </div>
          )}
          {activeTab === "classes" && (
            <div className="space-y-6">
              <Classes />
            </div>
          )}
        </div>

        {/* Department Info Footer */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-gray-400 text-sm">
                Department of Computer Science
              </p>
              <p className="text-gray-300">Head of Department Dashboard v2.0</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-400">
                  System Status: Online
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
