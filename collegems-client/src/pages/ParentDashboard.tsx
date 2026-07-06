import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useNavigate, Link } from "react-router-dom";
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
  Award,
  ChevronRight,
  Moon,
  Sun,
  CalendarDays,
  AwardIcon,
  HeartHandshake,
} from "lucide-react";
import api from "../api/axios";
import Attendance from "../user-components/Attendance";
import Fees from "../user-components/Fee";
import Assignment from "../user-components/Assignment";
import Courses from "../user-components/Courses";
import ExamSchedule from "../user-components/ExamSchedule";
import StudentResults from "../user-components/StudentResults";
import EventsStudent from "../user-components/EventsStudent";
import AcademicCalendar from "../common-components-management/AcademicCalendar";
import Library from "../common-components-management/Library";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { darkMode, toggleTheme } = useTheme();

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userData");
    localStorage.removeItem("childStudentId");
    navigate("/login");
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard");
      setData(res.data);
      if (res.data?.student?._id) {
        localStorage.setItem("childStudentId", res.data.student._id);
      }
    } catch (err: unknown) {
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

  const parentName = data?.user?.name || "Parent";
  const child = data?.student;
  const childProgram = child?.course
    ? `${child.course}${child.semester ? ` - Sem ${child.semester}` : ""}`
    : "No course linked";

  const navigationItems = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "attendance", label: "Child's Attendance", icon: CalendarCheck },
    { id: "assignments", label: "Child's Assignments", icon: FileText },
    { id: "fees", label: "Fee Details", icon: Wallet },
    { id: "courses", label: "Academic Courses", icon: BookOpen },
    { id: "examschedule", label: "Exam Schedule", icon: Calendar },
    { id: "academic-calendar", label: "Academic Calendar", icon: CalendarDays },
    { id: "events", label: "Campus Events", icon: CalendarDays },
    { id: "results", label: "Term Results", icon: AwardIcon },
    { id: "library", label: "Library Catalog", icon: BookOpen },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading parent portal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
            <Bell className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to load dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There was an error loading your dashboard. Please try again.
          </p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors">
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
          w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HeartHandshake className="w-6 h-6 text-purple-600" />
                  Parent Portal
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Monitoring Child's Progress
                </p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Child Profile Summary */}
            {child ? (
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
                    {child.name?.charAt(0) || "C"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {child.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      ID: {child.studentId}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs pt-3 border-t border-purple-100/50 dark:border-purple-900/20">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Semester</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {child.semester || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Course</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {child.course || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-lg text-xs">
                No active child details linked. Please contact administration.
              </div>
            )}
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
                      ${isActive
                        ? "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }
                    `}
                  >
                    <Icon
                      className={`w-5 h-5 ${isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500"}`}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto text-purple-600 dark:text-purple-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="space-y-2">
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                Logged in as: <span className="font-medium text-gray-700 dark:text-gray-300">{parentName}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 text-gray-500" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 transition-colors">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left Section */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="relative hidden sm:block">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-64"
                  />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  )}
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg relative">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-purple-600 rounded-full"></span>
                </button>
                <div className="flex items-center gap-2 px-3 py-2 border-l border-gray-200 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-700 dark:text-purple-300 font-semibold text-sm">
                    {parentName.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {parentName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Parent Account
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {getGreeting()}, {parentName.split(" ")[0]}!
                </h1>
                {child ? (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Here's a review of your child <span className="font-semibold text-purple-600 dark:text-purple-400">{child.name}</span>'s academic records.
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Welcome to the parent portal.
                  </p>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100/50 dark:border-purple-900/10">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {data.cards?.map((stat: Record<string, unknown>, index: number) => {
                  const colors = [
                    "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                    "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                    "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
                  ][index % 3];

                  const icons = [CalendarCheck, FileText, Wallet];
                  const Icon = icons[index % 3];

                  return (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg border ${colors}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Access Block */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Monitoring Views
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab("attendance")}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-blue-50/20 dark:bg-blue-950/10 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-left"
                  >
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Attendance Analytics</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Verify class presence, absences, and attendance rates.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("assignments")}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-left"
                  >
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Active Assignments</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review pending, completed, or overdue homework.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("results")}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-purple-50/20 dark:bg-purple-950/10 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all text-left"
                  >
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Grades & Term Results</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Track final results, grades, and term performance.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Child Academic Summary Card */}
              {child && (
                <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl" />
                  <div className="absolute left-1/3 top-0 -translate-y-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-xl" />
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-lg font-semibold text-purple-200">Linked Academic Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      <div>
                        <span className="text-purple-200/70 text-xs block">Student Full Name</span>
                        <p className="text-lg font-bold">{child.name}</p>
                      </div>
                      <div>
                        <span className="text-purple-200/70 text-xs block">Institution ID Number</span>
                        <p className="text-lg font-bold">{child.studentId}</p>
                      </div>
                      <div>
                        <span className="text-purple-200/70 text-xs block">Program / Department</span>
                        <p className="text-lg font-bold">{childProgram}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-purple-800/60 flex flex-wrap gap-4 text-xs text-purple-200/80">
                      <span>• Registered Email: {child.email}</span>
                      <span>• Notification Alerts: Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm transition-colors">
              {activeTab === "attendance" && <Attendance />}
              {activeTab === "assignments" && <Assignment />}
              {activeTab === "fees" && <Fees />}
              {activeTab === "courses" && <Courses />}
              {activeTab === "examschedule" && <ExamSchedule />}
              {activeTab === "academic-calendar" && <AcademicCalendar role="student" />}
              {activeTab === "events" && <EventsStudent />}
              {activeTab === "results" && <StudentResults />}
              {activeTab === "library" && <Library />}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
              <p>
                © {new Date().getFullYear()} Parent Monitoring Portal. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-gray-900 dark:hover:text-white">
                  Support
                </a>
                <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white">
                  Privacy Policy
                </Link>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white">
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
