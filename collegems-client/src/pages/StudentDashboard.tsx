import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AwardIcon,
  BarChart,
  Bell,
  BookOpen,
  Bus,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sun,
  Trophy,
  Wallet,
  X,
  AlertCircle,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Users,
  UserCircle,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import api from "../api/axios";
import { trackView } from "../utils/trackView";

// Common Components
import AcademicCalendar from "../common-components-management/AcademicCalendar";
import AssignmentReminder from "../common-components-management/AssignmentReminder";
import BusRoutes from "../common-components-management/BusRoutes";
import Library from "../common-components-management/Library";
import NotificationBell from "../common-components-management/NotificationBell";
import Scholarships from "../common-components-management/Scholarships";
import ThemeSwitcher from "../components/ThemeSwitcher";

// Student Components
import Assignment from "../user-components/Assignment";
import Attendance from "../user-components/Attendance";
import Courses from "../user-components/Courses";
import ExamSchedule from "../user-components/ExamSchedule";
import ExaminationForm from "../user-components/ExaminationForm";
import EventsStudent from "../user-components/EventsStudent";
import Fees from "../user-components/Fee";
import StudentFeedback from "../user-components/Feedback";
import LeaveRequest from "../user-components/LeaveRequest";
import StudentAchievements from "../user-components/StudentAchievements";
import ProfileCompletionCard from "../user-components/ProfileCompletionCard";
import PlacementEligibility from "../user-components/PlacementEligibility";
import IDCard from "../user-components/IDCard";
import FacultyView from "../user-components/FacultyView";
import StudentResults from "../user-components/StudentResults";
import StudentSeatView from "../user-components/StudentSeatView";
import UpcomingExamsWidget from "../user-components/UpcomingExamWidget";
import ResourceBooking from "../user-components/ResourceBooking";
import AnnouncementsView from "../user-components/AnnouncementsView";
import SemesterComparison from "../user-components/SemesterComparison";
import UserWorkflows from "../user-components/UserWorkflows";

// HOD Components
import Teachers from "../hod-components/Teachers";

type TabType =
  | "overview"
  | "attendance"
  | "assignments"
  | "fees"
  | "courses"
  | "examschedule"
  | "academic-calendar"
  | "events"
  | "results"
  | "achievements"
  | "announcements"
  | "leave"
  | "library"
  | "exam-form"
  | "my-seat"
  | "placement"
  | "faculty"
  | "scholarships"
  | "id-card"
  | "feedback"
  | "bus-routes"
  | "book-resources"
  | "subject-faculty"
  | "semester-comparison"
  | "user-workflows"
  | "settings"
  | "grade-trend";

const navigationItems: {
  id: TabType;
  label: string;
  icon: any;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "assignments", label: "Assignments", icon: FileText },
  { id: "fees", label: "Fees", icon: Wallet },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "examschedule", label: "Exam Schedule", icon: Calendar },
  { id: "academic-calendar", label: "Academic Calendar", icon: CalendarDays },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "faculty", label: "Faculty", icon: Users },
  { id: "subject-faculty", label: "Subject Faculty", icon: GraduationCap },
  { id: "results", label: "Results", icon: AwardIcon },
  { id: "semester-comparison", label: "Semester Comparison", icon: TrendingUp },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "leave", label: "Leave Requests", icon: ClipboardList },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "exam-form", label: "Examination Form", icon: FileText },
  { id: "scholarships", label: "Scholarships", icon: AwardIcon },
  { id: "id-card", label: "ID Card", icon: UserCircle },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "placement", label: "Placement", icon: Briefcase },
  { id: "bus-routes", label: "Bus Tracking", icon: Bus },
  { id: "book-resources", label: "Book Resources", icon: CalendarDays },
  { id: "user-workflows", label: "My Workflows", icon: FileText },
  { id: "grade-trend", label: "Grade Trend", icon: BarChart },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/users/me");
        setProfileData(res.data);
        if (res.data?._id) trackView("Student", res.data._id);
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    fetchProfile();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const student = data?.user;
  const studentProgram = student?.course
    ? `${student.course}${student.semester ? ` - Sem ${student.semester}` : ""}`
    : "Course not set";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex overflow-hidden">
        {/* Skeleton Sidebar (Hidden on mobile, visible on desktop) */}
        <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse h-16"></div>
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-11 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        </aside>

        {/* Skeleton Main Layout */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Skeleton Header */}
          <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 sm:px-6 lg:px-8">
            <div className="h-8 w-8 lg:hidden bg-gray-200 dark:bg-gray-800 rounded animate-pulse mr-4"></div>
            <div className="h-9 w-64 hidden sm:block bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="ml-auto flex gap-3">
              <div className="h-9 w-9 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="h-9 w-9 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
            </div>
          </header>

          {/* Skeleton Dashboard Content */}
          <main className="p-4 sm:p-6 lg:p-8 flex-1">
            {/* Title Area */}
            <div className="mb-8">
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-3"></div>
              <div className="h-4 w-96 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>

            {/* Stats Grid Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-36"
                >
                  <div className="flex justify-between items-start animate-pulse">
                    <div className="space-y-3">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
                      <div className="h-7 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    </div>
                    <div className="h-11 w-11 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                  </div>
                  <div className="mt-6 h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Quick Actions & Schedule Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-64 animate-pulse"></div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-64 animate-pulse"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Bell className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to load dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There was an error loading your dashboard. Please try again.
          </p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Student Portal
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {" "}
                  {studentProgram}
                </p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-white">
                {student?.name || "Student"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                ID: {student?.studentId || "Not set"}
              </p>
            </div>
          </div>

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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("settings")}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Settings className="w-4 h-4 text-gray-500" /> Settings
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <LogOut className="w-4 h-4 text-gray-500" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div className="relative hidden sm:block">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {activeTab === "overview"
                ? `${getGreeting()}, ${student?.name?.split(" ")[0] || "Student"}!`
                : navigationItems.find((item) => item.id === activeTab)?.label}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Here's what's happening with your academic progress.
            </p>
          </div>

          {/* Content Area */}
          {activeTab === "overview" ? (
            <div className="space-y-8">
              {/* Profile Completion */}
              {profileData?.profileCompletion && (
                <ProfileCompletionCard
                  percentage={profileData.profileCompletion.percentage}
                  missingFields={profileData.profileCompletion.missingFields}
                />
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: "Attendance",
                    value:
                      data?.cards?.find((c: any) => c.title === "Attendance")
                        ?.value || "0%",
                    icon: CalendarCheck,
                    color: "blue",
                    trend: "Overall",
                  },
                  {
                    title: "Pending Assignments",
                    value:
                      data?.cards?.find(
                        (c: any) => c.title === "Pending Assignments",
                      )?.value || "0",
                    icon: FileText,
                    color: "amber",
                    trend: "Current",
                  },
                  {
                    title: "Fee Due",
                    value:
                      "₹" +
                      (data?.cards?.find((c: any) => c.title === "Fee Due")
                        ?.value || "0"),
                    icon: Wallet,
                    color: "emerald",
                    trend: "Total",
                  },
                  {
                    title: "Courses",
                    value: "Active",
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
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${colorClasses}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-sm">
                        <TrendingUp
                          className={`w-4 h-4 ${
                            stat.title === "Fee Due" && stat.value !== "₹0"
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}
                        />
                        <span
                          className={`font-medium ${
                            stat.title === "Fee Due" && stat.value !== "₹0"
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}
                        >
                          {stat.trend}
                        </span>
                        <span className="text-gray-500 ml-1">status</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Assignment Reminders widget */}
              <AssignmentReminder />

              {/* Quick Actions */}

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
                      label: "Submit Feedback",
                      description: "Share your thoughts on courses and campus",
                      icon: MessageSquare,
                      color: "emerald",
                      onClick: () => setActiveTab("feedback"),
                    },
                  ].map((action, index) => {
                    const Icon = action.icon;
                    const colorClasses = {
                      blue: "bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-gray-700",
                      amber:
                        "bg-amber-50 dark:bg-gray-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-gray-700",
                      emerald:
                        "bg-emerald-50 dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-gray-700",
                    }[action.color];

                    return (
                      <button
                        key={index}
                        onClick={action.onClick}
                        className={`flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700
            transition-all duration-200 text-left ${colorClasses} hover:shadow-md`}
                      >
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-900">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {action.label}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {action.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Today's Schedule
                  </h2>
                  <button
                    onClick={() => {}}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {data?.todayClasses && data.todayClasses.length > 0 ? (
                    data.todayClasses
                      .slice(0, 3)
                      .map((class_: any, index: number) => {
                        const parseTime = (timeStr: string) => {
                          const [time, modifier] = timeStr.split(" ");
                          let [hours, minutes] = time.split(":");
                          if (hours === "12") hours = "00";
                          if (modifier.toUpperCase() === "PM")
                            hours = String(parseInt(hours, 10) + 12);
                          return (
                            parseInt(hours, 10) * 60 + parseInt(minutes, 10)
                          );
                        };
                        const now = new Date();
                        const currentMinutes =
                          now.getHours() * 60 + now.getMinutes();
                        const isUpcoming =
                          data.todayClasses.findIndex(
                            (c: any) => parseTime(c.time) >= currentMinutes,
                          ) === index;

                        return (
                          <div
                            key={class_.id || index}
                            className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                              isUpcoming
                                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 shadow-sm"
                                : "bg-gray-50 dark:bg-gray-800 border border-transparent"
                            }`}
                          >
                            <div
                              className={`w-16 text-sm font-medium ${
                                isUpcoming
                                  ? "text-blue-700 dark:text-blue-400"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {class_.time}
                            </div>
                            <div className="flex-1">
                              <p
                                className={`font-medium ${isUpcoming ? "text-blue-900 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}
                              >
                                {class_.subject}
                              </p>
                              <p
                                className={`text-sm ${isUpcoming ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
                              >
                                {class_.faculty} • {class_.room} • {class_.type}
                              </p>
                            </div>
                            {isUpcoming && (
                              <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full animate-pulse">
                                Next
                              </span>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No classes scheduled for today.</p>
                    </div>
                  )}
                </div>
              </div>

              <UpcomingExamsWidget />
              <StudentAchievements />
            </div>
          ) : (
            <div
              className={
                activeTab === "leave" ||
                activeTab === "achievements" ||
                activeTab === "my-seat"
                  ? ""
                  : "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              }
            >
              {/* Cleaned up duplicate render blocks */}
              {activeTab === "attendance" && <Attendance />}
              {activeTab === "assignments" && <Assignment />}
              {activeTab === "fees" && <Fees />}
              {activeTab === "courses" && <Courses />}
              {activeTab === "examschedule" && <ExamSchedule />}
              {activeTab === "my-seat" && <StudentSeatView />}
              {activeTab === "academic-calendar" && (
                <AcademicCalendar role="student" />
              )}
              {activeTab === "events" && <EventsStudent />}
              {activeTab === "results" && <StudentResults />}
              {activeTab === "semester-comparison" && <SemesterComparison />}
              {activeTab === "achievements" && <StudentAchievements />}
              {activeTab === "announcements" && <AnnouncementsView />}
              {activeTab === "leave" && <LeaveRequest />}
              {activeTab === "library" && <Library />}
              {activeTab === "exam-form" && <ExaminationForm />}
              {activeTab === "scholarships" && <Scholarships />}
              {activeTab === "feedback" && <StudentFeedback />}
              {activeTab === "id-card" && <IDCard student={student} />}
              {activeTab === "bus-routes" && <BusRoutes />}
              {activeTab === "faculty" && <FacultyView />}
              {activeTab === "subject-faculty" && <Teachers />}
              {activeTab === "book-resources" && <ResourceBooking />}
              {activeTab === "placement" && <PlacementEligibility />}
              {activeTab === "user-workflows" && <UserWorkflows />}

              {activeTab === "settings" && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Settings are not available yet for student accounts.
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <p>
                Copyright {new Date().getFullYear()} Student Portal. All rights
                reserved.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Help
                </a>
                <Link
                  to="/privacy"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Privacy
                </Link>
                <a
                  href="#"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
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
