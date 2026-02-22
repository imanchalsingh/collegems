import { useEffect, useState } from "react";
import {
  LayoutGrid,
  CalendarCheck,
  FileText,
  Wallet,
  BookOpen,
  Calendar,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Settings,
  TrendingUp,
  Award,
  ChevronRight,
  Moon,
  Sun,
  CalendarDays,
} from "lucide-react";
import api from "../../api/axios";
import Attendance from "./Attendance";
import Fees from "./Fee";
import Assignment from "./Assignment";
import Courses from "./Courses";
import ExamSchedule from "./ExamSchedule";
import Events from "../../components/Events";

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const navigationItems = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "fees", label: "Fees", icon: Wallet },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "examschedule", label: "Exam Schedule", icon: Calendar },
    { id: "events", label: "Events", icon: CalendarDays },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Bell className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load dashboard
          </h3>
          <p className="text-gray-600 mb-6">
            There was an error loading your dashboard. Please try again.
          </p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Student Portal
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {data.user?.department || "Computer Science"}
                </p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Student Profile Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {data.user?.name?.charAt(0) || "S"}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {data.user?.name || "Student"}
                  </p>
                  <p className="text-xs text-gray-600">
                    ID: {data.user?.studentId || "STU001"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Semester</span>
                  <p className="font-medium text-gray-900">
                    {data.currentSemester || "5th"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Section</span>
                  <p className="font-medium text-gray-900">A</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                      transition-colors relative
                      ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }
                    `}
                  >
                    <Icon
                      className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500"}`}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <Settings className="w-4 h-4 text-gray-500" />
                Settings
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <LogOut className="w-4 h-4 text-gray-500" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left Section */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div className="relative hidden sm:block">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
                </button>
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {data.user?.name?.charAt(0) || "S"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {data.user?.name || "Student"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {data.user?.email || "student@college.edu"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {getGreeting()}, {data.user?.name?.split(" ")[0] || "Student"}
                  !
                </h1>
                <p className="text-gray-500 mt-1">
                  Here's what's happening with your academic progress today.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {activeTab === "overview" ? (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: "Attendance",
                    value: "85%",
                    icon: CalendarCheck,
                    color: "blue",
                    trend: "+2.5%",
                  },
                  {
                    title: "Assignments",
                    value: "8/10",
                    icon: FileText,
                    color: "amber",
                    trend: "2 pending",
                  },
                  {
                    title: "CGPA",
                    value: "3.8",
                    icon: Award,
                    color: "emerald",
                    trend: "+0.3",
                  },
                  {
                    title: "Courses",
                    value: "6",
                    icon: BookOpen,
                    color: "purple",
                    trend: "Active",
                  },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  const colorClasses = {
                    blue: "bg-blue-50 text-blue-700",
                    amber: "bg-amber-50 text-amber-700",
                    emerald: "bg-emerald-50 text-emerald-700",
                    purple: "bg-purple-50 text-purple-700",
                  }[stat.color];

                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${colorClasses}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-sm">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {stat.trend}
                        </span>
                        <span className="text-gray-500 ml-1">
                          from last month
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Submit Assignment",
                      description: "You have 2 pending assignments",
                      icon: FileText,
                      color: "blue",
                      onClick: () => setActiveTab("assignments"),
                    },
                    {
                      label: "Pay Fees",
                      description: "Due date: March 15, 2024",
                      icon: Wallet,
                      color: "amber",
                      onClick: () => setActiveTab("fees"),
                    },
                    {
                      label: "Mark Attendance",
                      description: "Today's class: 10:30 AM",
                      icon: CalendarCheck,
                      color: "emerald",
                      onClick: () => setActiveTab("attendance"),
                    },
                  ].map((action, index) => {
                    const Icon = action.icon;
                    const colorClasses = {
                      blue: "bg-blue-50 text-blue-700 hover:bg-blue-100",
                      amber: "bg-amber-50 text-amber-700 hover:bg-amber-100",
                      emerald:
                        "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                    }[action.color];

                    return (
                      <button
                        key={index}
                        onClick={action.onClick}
                        className={`
                          flex items-start gap-4 p-4 rounded-lg border border-gray-200
                          transition-colors text-left ${colorClasses}
                        `}
                      >
                        <div className="p-2 rounded-lg bg-white">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {action.label}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {action.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Today's Schedule
                  </h2>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      time: "09:00 AM",
                      subject: "Data Structures",
                      room: "Room 401",
                      type: "Lecture",
                    },
                    {
                      time: "11:00 AM",
                      subject: "Database Systems",
                      room: "Room 203",
                      type: "Lab",
                    },
                    {
                      time: "02:00 PM",
                      subject: "Web Development",
                      room: "Room 105",
                      type: "Lecture",
                    },
                  ].map((class_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="w-16 text-sm font-medium text-gray-700">
                        {class_.time}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {class_.subject}
                        </p>
                        <p className="text-sm text-gray-500">
                          {class_.room} • {class_.type}
                        </p>
                      </div>
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {activeTab === "attendance" && <Attendance />}
              {activeTab === "assignments" && <Assignment />}
              {activeTab === "fees" && <Fees />}
              {activeTab === "courses" && <Courses />}
              {activeTab === "examschedule" && <ExamSchedule />}
              {activeTab === "events" && <Events />}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
              <p>
                © {new Date().getFullYear()} Student Portal. All rights
                reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-gray-900">
                  Help
                </a>
                <a href="#" className="hover:text-gray-900">
                  Privacy
                </a>
                <a href="#" className="hover:text-gray-900">
                  Terms
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
