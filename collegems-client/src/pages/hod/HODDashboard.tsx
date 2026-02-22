import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  FileText,
  Wallet,
  DollarSign,
  Calendar,
  Menu,
  X,
  RefreshCw,
  ChevronRight,
  Bell,
  Search,
  UserCircle,
  LogOut,
  Settings,
  Home,
  CalendarDays,
} from "lucide-react";
import api from "../../api/axios";
import HodCourses from "../../components/Courses";
import Students from "../../components/Students";
import Teachers from "../../components/Teachers";
import ExamSchedule from "../../components/ExamSchedule";
import Classes from "../../components/Classes";
import Hodfee from "./Hodfee";
import HODSalary from "./HODSalary";
import Syllabus from "../../components/Syllabus";
import HODTeacherAttendance from "./HodTeacherAttendance";
import OrganizeEvents from "../../components/OrganizeEvents";

type TabType =
  | "overview"
  | "teachers"
  | "teachers-attendance"
  | "students"
  | "courses"
  | "classes"
  | "syllabus"
  | "fees"
  | "salary"
  | "examSchedule"
  | "events";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navigationItems = [
    { id: "overview" as TabType, label: "Overview", icon: LayoutGrid },
    { id: "teachers" as TabType, label: "Teachers", icon: Users },
    {
      id: "teachers-attendance" as TabType,
      label: "Teachers Attendance",
      icon: Users,
    },
    { id: "students" as TabType, label: "Students", icon: GraduationCap },
    { id: "courses" as TabType, label: "Courses", icon: BookOpen },
    { id: "classes" as TabType, label: "Classes", icon: Building2 },
    { id: "syllabus" as TabType, label: "Syllabus", icon: FileText },
    { id: "fees" as TabType, label: "Fees", icon: Wallet },
    { id: "salary" as TabType, label: "Salary", icon: DollarSign },
    { id: "examSchedule" as TabType, label: "Exam Schedule", icon: Calendar },
    { id: "events" as TabType, label: "Organize Events", icon: CalendarDays },
  ];

  const statsCards = data?.cards.map((card, index) => ({
    ...card,
    icon: [Users, GraduationCap, BookOpen, Building2][index % 4],
    color:
      index === 0
        ? "blue"
        : index === 1
          ? "amber"
          : index === 2
            ? "emerald"
            : "purple",
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
            There was an error fetching your dashboard data. Please try again.
          </p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
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
                <h2 className="text-xl font-bold text-gray-900">HOD Portal</h2>
                <p className="text-sm text-gray-500 mt-1">Computer Science</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
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
                <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
                </button>
                <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg">
                  <UserCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    Dr. Smith
                  </span>
                </button>
                <button
                  onClick={fetchDashboardData}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {navigationItems.find((item) => item.id === activeTab)?.label}
            </h1>
            <p className="text-gray-500 mt-1">
              {activeTab === "overview"
                ? "Welcome back, Dr. Smith. Here's what's happening with your department today."
                : `Manage your department's ${activeTab.toLowerCase()}`}
            </p>
          </div>

          {/* Content Area */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards?.map((card, index) => {
                  const Icon = card.icon;
                  const colorClasses = {
                    blue: "bg-blue-50 text-blue-700",
                    amber: "bg-amber-50 text-amber-700",
                    emerald: "bg-emerald-50 text-emerald-700",
                    purple: "bg-purple-50 text-purple-700",
                  }[card.color];

                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">
                            {card.title}
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {card.value}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${colorClasses}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          View details
                          <ChevronRight className="w-4 h-4" />
                        </button>
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
                      label: "Add New Teacher",
                      icon: Users,
                      color: "blue",
                      onClick: () => setActiveTab("teachers"),
                    },
                    {
                      label: "View Students",
                      icon: GraduationCap,
                      color: "amber",
                      onClick: () => setActiveTab("students"),
                    },
                    {
                      label: "Manage Courses",
                      icon: BookOpen,
                      color: "emerald",
                      onClick: () => setActiveTab("courses"),
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
                          flex items-center gap-4 p-4 rounded-lg border border-gray-200
                          transition-colors ${colorClasses}
                        `}
                      >
                        <div className="p-2 rounded-lg bg-white">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {[1, 2, 3].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Home className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          New teacher application submitted
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          2 hours ago
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "teachers" && <Teachers />}
          {activeTab === "teachers-attendance" && <HODTeacherAttendance />}
          {activeTab === "students" && <Students />}
          {activeTab === "fees" && <Hodfee />}
          {activeTab === "salary" && <HODSalary />}
          {activeTab === "syllabus" && <Syllabus />}
          {activeTab === "courses" && <HodCourses />}
          {activeTab === "examSchedule" && <ExamSchedule />}
          {activeTab === "classes" && <Classes />}
          {activeTab === "classes" && <OrganizeEvents />}
        </main>
      </div>
    </div>
  );
}
