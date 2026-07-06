import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import MyAssignments from "../teacher-components/MyAssignments";
import api from "../api/axios";
import {
  Users, BarChart3, FileText, Clock, Bell, Search, LayoutDashboard,
  CheckSquare, ClipboardList, BookMarked, Book, Coins, Menu, X,
  ChevronRight, Calendar, LogOut, Settings, GraduationCap, CalendarDays,
  Percent, Moon, Sun, ClipboardCheck, Trophy,
  Briefcase,
  ShieldCheck,
  User,
} from "lucide-react";
import HodCourses from "../teacher-components/Courses";
import TeacherAssignments from "../teacher-components/Assignment";
import Students from "../common-components-management/Students";
import ExamSchedule from "../teacher-components/ExamSchedule";
import Classes from "../teacher-components/Classes";
import TeacherFee from "../teacher-components/Teacherfee";
import Salary from "../teacher-components/Salary";
import Syllabus from "../teacher-components/Syllabus";
import MyAttendance from "../teacher-components/MyAttendance";
import OrganizeEvents from "../teacher-components/EventsManage";
import TeacherResults from "../teacher-components/TeacherResults";
import StudentAttendance from "../teacher-components/Attendance";
import TeacherSettings from "../teacher-components/Settings";
import AcademicCalendar from "../common-components-management/AcademicCalendar";
import Library from "../common-components-management/Library";
import LeaveApprovals from "../teacher-components/LeaveApprovals";
import AchievementSubmissionForm from "../teacher-components/AchievementSubmissionForm";
import AssessmentSettings from "../teacher-components/AssessmentSettings";
import InternalMarksEntry from "../teacher-components/InternalMarksEntry";
import OfficeHours from "../teacher-components/OfficeHours";
import ResourceBooking from "../user-components/ResourceBooking";
import AnnouncementForm from "../common-components-management/AnnouncementForm";
import AnnouncementManage from "../common-components-management/AnnouncementManage";
import Clubs from "../common-components-management/Clubs";
import PlagiarismChecker from "../teacher-components/PlagiarismChecker";
import { useNotifications } from "../hooks/useNotifications";
import RiskDashboard from "./RiskDashboard";
import AttendanceAlertsWidget from "../teacher-components/AttendanceAlertsWidget";
import UserWorkflows from "../user-components/UserWorkflows";
import ThemeSwitcher from "../components/ThemeSwitcher";
import TeacherProfile from "../teacher-components/TeacherProfile";

interface TeacherDashboardProps {
  initialTab?: string;
}

export default function TeacherDashboard({ initialTab }: TeacherDashboardProps) {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [courses, setCourses] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab ?? "overview");
  const { notifications } = useNotifications();
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [refreshAnnouncements, setRefreshAnnouncements] = useState(0);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, coursesRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/courses/all"),
      ]);
      setData(dashboardRes.data);
      
      // --- NEW SAFTEY CHECK FOR COURSES ---
      const fetchedCourses = coursesRes.data;
      if (Array.isArray(fetchedCourses)) {
        setCourses(fetchedCourses);
      } else if (fetchedCourses && Array.isArray(fetchedCourses.data)) {
        setCourses(fetchedCourses.data);
      } else if (fetchedCourses && Array.isArray(fetchedCourses.courses)) {
        setCourses(fetchedCourses.courses);
      } else {
        setCourses([]); // Fallback to an empty array to prevent crashes
      }
      // ------------------------------------

      setUpcomingClasses([
        { id: 1, course: "Mathematics 101", time: "10:00 AM", room: "Room 301", status: "upcoming", students: 28 },
        { id: 2, course: "Physics 201", time: "2:00 PM", room: "Lab 204", status: "upcoming", students: 24 },
        { id: 3, course: "Computer Science 301", time: "4:00 PM", room: "Room 105", status: "completed", students: 32 },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigationItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "profile", label: "My Profile", icon: User },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "myattendance", label: "My Attendance", icon: ClipboardList },
    { id: "officehours", label: "Office Hours", icon: Clock },
    { id: "courses", label: "My Courses", icon: BookMarked },
    { id: "my-assignments", label: "My Assignments", icon: Briefcase },
    { id: "assignments", label: "Assignments", icon: CheckSquare },
    { id: "attendance", label: "Attendance", icon: ClipboardList },
    { id: "leave-approvals", label: "Leave Approvals", icon: ClipboardCheck },
    { id: "academic-calendar", label: "Academic Calendar", icon: Calendar },
    { id: "examschedules", label: "Exam Schedules", icon: Calendar },
    { id: "fees", label: "Fees", icon: BarChart3 },
    { id: "salary", label: "Salary", icon: Coins },
    { id: "classes", label: "Classes", icon: Book },
    { id: "syllabus", label: "Syllabus", icon: FileText },
    { id: "results", label: "Results", icon: Percent },
    { id: "assessments", label: "Assessment Config", icon: Settings },
    { id: "internal-marks", label: "Internal Marks", icon: Percent },
    { id: "students", label: "Students", icon: Users },
    { id: "achievements", label: "Add Achievements", icon: Trophy },
    { id: "events", label: "Organize Events", icon: CalendarDays },
    { id: "library", label: "Library Catalog", icon: Book },
    { id: "book-resources", label: "Book Resources", icon: CalendarDays },
    { id: "clubs", label: "Clubs & Organizations", icon: Users },
    { id: "plagiarism-checker", label: "Plagiarism Checker", icon: ShieldCheck },
    { id: "risk-dashboard", label: "Predictive Analytics", icon: LayoutDashboard },
    { id: "user-workflows", label: "My Workflows", icon: FileText },
  ];

  const activeTabLabel = activeTab === "settings" ? "Settings"
    : navigationItems.find((item) => item.id === activeTab)?.label;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment": return <FileText className="w-4 h-4" />;
      case "announcement": return <Bell className="w-4 h-4" />;
      case "attendance": return <BarChart3 className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "assignment": return "bg-blue-50 text-blue-700";
      case "announcement": return "bg-amber-50 text-amber-700";
      case "attendance": return "bg-emerald-50 text-emerald-700";
      default: return "bg-gray-50 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Teacher Portal</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Faculty Dashboard</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {data?.user?.name?.charAt(0) || "T"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{data?.user?.name || "Teacher"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{data?.user?.email || "teacher@college.edu"}</p>
              </div>
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
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative ${isActive ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500 dark:text-gray-400"}`} />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              <button onClick={() => { setActiveTab("settings"); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Settings
              </button>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="relative hidden sm:block">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search courses, students..." className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-80 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Theme Toggle */}
                <ThemeSwitcher />
                <button onClick={() => navigate("/teacher/announcements")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative" title="Go to announcements">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
                </button>
                <button onClick={fetchDashboardData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
                  <Clock className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{activeTabLabel}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === "overview"
                ? `Welcome back, ${data?.user?.name || "Teacher"}. Here's your teaching overview for today.`
                : `Manage your ${activeTab.toLowerCase()}`}
            </p>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Courses", value: courses.length, icon: BookMarked, color: "blue" },
                  { label: "Total Students", value: "124", icon: Users, color: "amber" },
                  { label: "Classes Today", value: "4", icon: Clock, color: "emerald" },
                  { label: "Pending Reviews", value: "8", icon: ClipboardCheck, color: "purple" },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  const colorClasses = {
                    blue: "bg-blue-50 text-blue-700",
                    amber: "bg-amber-50 text-amber-700",
                    emerald: "bg-emerald-50 text-emerald-700",
                    purple: "bg-purple-50 text-purple-700",
                  }[stat.color];
                  return (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${colorClasses}`}><Icon className="w-5 h-5" /></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* My Courses */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Courses</h2>
                      <button onClick={() => setActiveTab("courses")} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                        View all <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(Array.isArray(courses) ? courses : []).slice(0, 3).map((course, index) => (
                        <div key={course._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <BookMarked className="w-4 h-4 text-blue-700" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{course.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Course Code: CS{101 + index}</p>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">32 students</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Today's Schedule */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Schedule</h2>
                    <div className="space-y-3">
                      {upcomingClasses.map((classItem) => (
                        <div key={classItem.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">{classItem.course}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${classItem.status === "upcoming" ? "bg-blue-50 text-blue-700" : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}>
                              {classItem.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{classItem.time}</div>
                            <div className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{classItem.students} students</div>
                            <span>• {classItem.room}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">3 new</span>
                    </div>
                    <div className="space-y-3">
                      {notifications.map((notification: any) => (
                        <div key={notification.id} onClick={() => notification.type === "announcement" && navigate("/teacher/announcements")} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl cursor-pointer transition-colors">
                          <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-white">{notification.message}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Alerts Widget */}
                  <AttendanceAlertsWidget />
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && <TeacherProfile />}
          {activeTab === "myattendance" && <MyAttendance />}
          {activeTab === "officehours" && <OfficeHours />}
          {activeTab === "courses" && <HodCourses />}
          {activeTab === "assignments" && <TeacherAssignments courseId={courses[0]?._id || "default-course-id"} />}
          {activeTab === "attendance" && <StudentAttendance />}
          {activeTab === "leave-approvals" && <LeaveApprovals />}
          {activeTab === "examschedules" && <ExamSchedule />}
          {activeTab === "academic-calendar" && <AcademicCalendar role="teacher" />}
          {activeTab === "fees" && <TeacherFee />}
          {activeTab === "salary" && <Salary />}
          {activeTab === "classes" && <Classes />}
          {activeTab === "syllabus" && <Syllabus />}
          {activeTab === "results" && <TeacherResults />}
          {activeTab === "students" && <Students />}
          {activeTab === "achievements" && <AchievementSubmissionForm />}
          {activeTab === "assessments" && <AssessmentSettings />}
          {activeTab === "internal-marks" && <InternalMarksEntry />}
          {activeTab === "events" && <OrganizeEvents />}
          {activeTab === "settings" && <TeacherSettings />}
          {activeTab === "library" && <Library />}
          {activeTab === "my-assignments" && <MyAssignments />}
          {activeTab === "book-resources" && <ResourceBooking />}
          {activeTab === "clubs" && <Clubs />}
          {activeTab === "plagiarism-checker" && <PlagiarismChecker />}
          {activeTab === "risk-dashboard" && <RiskDashboard />}
          {activeTab === "user-workflows" && <UserWorkflows />}
          {activeTab === "announcements" && (
            <div className="space-y-8">
              <AnnouncementForm onSuccess={() => setRefreshAnnouncements((k) => k + 1)} />
              <hr className="border-gray-200 dark:border-gray-700" />
              <AnnouncementManage refreshKey={refreshAnnouncements} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}