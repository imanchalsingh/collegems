import { useEffect, useState, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutGrid, Users, GraduationCap, BookOpen, Building2, FileText,
  Wallet, DollarSign, Calendar, Menu, X, RefreshCw, ChevronRight,
  Bell, Search, UserCircle, LogOut, Settings, CalendarDays,
  Moon, Sun, Award, Bus, MessageSquare, Activity, Lock, Wrench
} from "lucide-react";
import api from "../api/axios";

// Management & HOD Components
import Scholarships from "../common-components-management/Scholarships";
import HODExamForms from "../hod-components/ExamForms";
import BusRoutes from "../common-components-management/BusRoutes";
import Students from "../common-components-management/Students";
import HODSalary from "../hod-components/Salary";
import HODTeacherAttendance from "../hod-components/TeacherAttendance";
import AcademicCalendar from "../common-components-management/AcademicCalendar";
import Teachers from "../hod-components/Teachers";
import Library from "../common-components-management/Library";
import HODSettings from "../hod-components/Settings";
import HODCourses from "../hod-components/Courses";
import AnnouncementForm from "../common-components-management/AnnouncementForm";
import AnnouncementManage from "../common-components-management/AnnouncementManage";
import FeedbackManagement from "../hod-components/FeedbackManagement";
import ExamHalls from "../hod-components/ExamHalls";
import HallAllocation from "../hod-components/HallAllocation";
import AuditLogs from "../hod-components/AuditLogs";
import BookingManagement from "../hod-components/BookingManagement";
import ResourceManagement from "../hod-components/ResourceManagement";
import SemesterManagement from "../hod-components/SemesterManagement";
import DataLocks from "../hod-components/DataLocks";
import { SequenceRepair } from "../common-components-management/SequenceRepair";
import FormAbandonmentStats from "../hod-components/FormAbandonmentStats";
import WorkflowAdmin from "../hod-components/WorkflowAdmin";
import WorkflowApprovals from "../hod-components/WorkflowApprovals";

// Pages
import RiskDashboard from "./RiskDashboard";
// If SystemLogsDashboard is in another folder, update this path accordingly. 
// For now, assuming it's in pages based on the previous error logs.
// import SystemLogsDashboard from "./SystemLogsDashboard";
import AttendanceAlertsWidget from "../teacher-components/AttendanceAlertsWidget";
import TrackingWidget from "../hod-components/TrackingWidget";
import SystemHealthDashboard from "../hod-components/SystemHealthDashboard";

type TabType =
  | "overview"
  | "analytics"
  | "announcements"
  | "teachers"
  | "teachers-attendance"
  | "students"
  | "courses"
  | "classes"
  | "syllabus"
  | "fees"
  | "salary"
  | "examSchedule"
  | "events"
  | "academic-calendar"
  | "library"
  | "settings"
  | "reports"
  | "exam-forms"
  | "scholarships"
  | "feedback"
  | "bus-routes"
  | "exam-halls"
  | "hall-allocation"
  | "audit-logs"
  | "manage-bookings"
  | "manage-resources"
  | "risk-dashboard"
  | "system-logs"
  | "system-health"
  | "freeze-semesters"
  | "data-locks"
  | "sequence-repair"
  | "form-insights"
  | "workflow-admin"
  | "workflow-approvals";

interface Data {
  cards: Array<{ title: string; value: number }>;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalClassess: number;
}

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  departmentCode?: string;
  role: string;
  avatarUrl?: string;
}

export default function HODDashboard() {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  // Dashboard states
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshAnnouncements, setRefreshAnnouncements] = useState(0);

  // Profile states
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<Date | null>(null);

  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchData, setSearchData] = useState({
    students: [],
    teachers: [],
    courses: [],
  });

  // Navigation items
  const navigationItems = [
    { id: "overview" as TabType, label: "Overview", icon: LayoutGrid },
    { id: "announcements" as TabType, label: "Announcements", icon: Bell },
    { id: "teachers" as TabType, label: "Teachers", icon: Users },
    { id: "teachers-attendance" as TabType, label: "Teachers Attendance", icon: Users },
    { id: "students" as TabType, label: "Students", icon: GraduationCap },
    { id: "academic-calendar" as TabType, label: "Academic Calendar", icon: Calendar },
    { id: "courses" as TabType, label: "Courses", icon: BookOpen },
    { id: "classes" as TabType, label: "Classes", icon: Building2 },
    { id: "syllabus" as TabType, label: "Syllabus", icon: FileText },
    { id: "fees" as TabType, label: "Fees", icon: Wallet },
    { id: "salary" as TabType, label: "Salary", icon: DollarSign },
    { id: "examSchedule" as TabType, label: "Exam Schedule", icon: Calendar },
    { id: "events" as TabType, label: "Organize Events", icon: CalendarDays },
    { id: "library" as TabType, label: "Library Catalog", icon: BookOpen },
    { id: "reports" as TabType, label: "Report Generator", icon: FileText },
    { id: "feedback" as TabType, label: "Feedback", icon: MessageSquare },
    { id: "exam-forms" as TabType, label: "Exam Forms", icon: FileText },
    { id: "scholarships" as TabType, label: "Scholarship Approvals", icon: Award },
    { id: "bus-routes" as TabType, label: "Bus Routes Management", icon: Bus },
    { id: "exam-halls" as TabType, label: "Exam Halls", icon: Building2 },
    { id: "hall-allocation" as TabType, label: "Hall Allocation", icon: Users },
    { id: "audit-logs" as TabType, label: "Audit Logs", icon: FileText },
    { id: "system-logs" as TabType, label: "System Traces", icon: FileText },
    { id: "system-health" as TabType, label: "System Health", icon: Activity },
    { id: "manage-bookings" as TabType, label: "Manage Bookings", icon: Calendar },
    { id: "manage-resources" as TabType, label: "Manage Resources", icon: Building2 },
    { id: "freeze-semesters" as TabType, label: "Freeze Semesters", icon: BookOpen },
    { id: "data-locks" as TabType, label: "Data Locks", icon: Lock },
    { id: "sequence-repair" as TabType, label: "Sequence Repair", icon: Wrench },
    { id: "form-insights" as TabType, label: "Form Insights", icon: Activity },
    { id: "risk-dashboard" as TabType, label: "Predictive Analytics", icon: LayoutGrid },
    { id: "workflow-admin" as TabType, label: "Workflow Builder", icon: Settings },
    { id: "workflow-approvals" as TabType, label: "Pending Approvals", icon: Activity },
  ];

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
    fetchProfileData();
    fetchSearchData();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userData");
    navigate("/login", { replace: true });
  };

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

  const fetchProfileData = async () => {
    try {
      setProfileLoading(true);
      setProfileRefreshing(true);
      const res = await api.get("/users/me");
      const user = res.data;
      if (user?.role !== "hod") {
        handleSignOut();
        return;
      }
      setProfile({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        department: user.department || "",
        departmentCode: user.departmentCode || "",
        role: user.role || "hod",
        avatarUrl: user.avatarUrl || user.profilePicture || user.photo,
      });
      setProfileUpdatedAt(new Date());
      setProfileError(null);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleSignOut();
        return;
      }
      setProfileError(error?.response?.data?.message || "Unable to load HOD profile.");
    } finally {
      setProfileLoading(false);
      setProfileRefreshing(false);
    }
  };

  const fetchSearchData = async () => {
    try {
      const [studentsRes, teachersRes, coursesRes] = await Promise.all([
        api.get("/users/students?limit=0"),
        api.get("/users/teachers"),
        api.get("/courses/all"),
      ]);
      setSearchData({
        // The students endpoint now returns a paginated envelope { success, data, meta };
        // fall back to the raw value for any future format changes.
        students: studentsRes.data?.data || studentsRes.data || [],
        teachers: teachersRes.data || [],
        courses: coursesRes.data || [],
      });
    } catch (error) {
      console.error("Error loading search data:", error);
    }
  };

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return { students: [], teachers: [], courses: [] };
    return {
      students: searchData.students.filter(
        (student: any) =>
          student.name?.toLowerCase().includes(query) ||
          student.email?.toLowerCase().includes(query)
      ),
      teachers: searchData.teachers.filter(
        (teacher: any) =>
          teacher.name?.toLowerCase().includes(query) ||
          teacher.email?.toLowerCase().includes(query)
      ),
      courses: searchData.courses.filter(
        (course: any) =>
          course.name?.toLowerCase().includes(query) ||
          course.code?.toLowerCase().includes(query) ||
          course.department?.toLowerCase().includes(query)
      ),
    };
  }, [searchData, searchTerm]);

  // Stats cards
  const statsCards = (data?.cards || []).map((card, index) => ({
    ...card,
    icon: [Users, GraduationCap, BookOpen, Building2][index % 4],
    color: [
      "bg-blue-50 text-blue-700",
      "bg-amber-50 text-amber-700",
      "bg-emerald-50 text-emerald-700",
      "bg-purple-50 text-purple-700"
    ][index % 4],
  }));

  const activeLabel = navigationItems.find((item) => item.id === activeTab)?.label || "Overview";
  const profileDepartment = profile?.department || profile?.departmentCode || "Department not set";
  const profileInitials = profile?.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "H";

  // Render tab content (non-overview tabs only; overview is rendered inline above)
  const renderTab = () => {
    if (activeTab === "overview") {
      return (
        <div className="space-y-8">
          {/* Profile Card */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name || "HOD"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-blue-700">{profileInitials || "H"}</span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{profile?.name || "HOD Profile"}</h2>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {profile?.role?.toUpperCase() || "HOD"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {profile?.department || "Department not assigned"}
                    {profile?.departmentCode ? ` • ${profile.departmentCode}` : ""}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                    {profile?.email || "No email available"}
                    {profile?.phone ? ` • ${profile.phone}` : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:min-w-[320px]">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Designation</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Head of Department</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Last sync</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {profileRefreshing ? "Refreshing..." : profileUpdatedAt
                      ? profileUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Waiting for data"}
                  </p>
                </div>
              </div>
            </div>
            {profileError && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{profileError}</div>
            )}
          </section>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards?.map((card, index) => {
              const Icon = card.icon;
              const colorClasses = {
                "bg-blue-50 text-blue-700": "bg-blue-50 text-blue-700 hover:bg-blue-100",
                "bg-amber-50 text-amber-700": "bg-amber-50 text-amber-700 hover:bg-amber-100",
                "bg-emerald-50 text-emerald-700": "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                "bg-purple-50 text-purple-700": "bg-purple-50 text-purple-700 hover:bg-purple-100",
              }[card.color] || card.color;

              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${card.color}`}><Icon className="w-5 h-5" /></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                      View details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions & Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Generate Reports", icon: FileText, color: "bg-blue-50 text-blue-700 hover:bg-blue-100", onClick: () => navigate("/hod/reports") },
                  { label: "View Students", icon: GraduationCap, color: "bg-amber-50 text-amber-700 hover:bg-amber-100", onClick: () => setActiveTab("students") },
                  { label: "Manage Courses", icon: BookOpen, color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100", onClick: () => setActiveTab("courses") },
                ].map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button key={index} onClick={action.onClick} className={`flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors ${action.color}`}>
                      <div className="p-2 rounded-lg bg-white dark:bg-gray-700"><Icon className="w-5 h-5" /></div>
                      <span className="font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <AttendanceAlertsWidget />
              <TrackingWidget />
            </div>
          </div>
        </div>
      );
    }
    const placeholders: Partial<Record<TabType, string>> = {
      classes: "Class management is not connected on this dashboard yet.",
      syllabus: "Syllabus management is not connected on this dashboard yet.",
      fees: "Fee management is not connected on this dashboard yet.",
      examSchedule: "Use the exam schedule route to manage exam schedules.",
      events: "Event management is not connected on this dashboard yet.",
      "system-logs": "System Logs dashboard is currently under development.", // <-- Add this line
    };

    if (placeholders[activeTab]) {
      return <div className="text-sm text-gray-600 dark:text-gray-300">{placeholders[activeTab]}</div>;
    }

    return (
      <>
        {activeTab === "announcements" && (
          <div className="space-y-8">
            <AnnouncementForm onSuccess={() => setRefreshAnnouncements((k) => k + 1)} />
            <hr className="border-gray-200 dark:border-gray-700" />
            <AnnouncementManage refreshKey={refreshAnnouncements} />
          </div>
        )}
        {activeTab === "teachers" && <Teachers />}
        {activeTab === "teachers-attendance" && <HODTeacherAttendance />}
        {activeTab === "students" && <Students />}
        {activeTab === "salary" && <HODSalary />}
        {activeTab === "academic-calendar" && <AcademicCalendar role="hod" />}
        {activeTab === "library" && <Library />}
        {activeTab === "courses" && <HODCourses />}
        {activeTab === "settings" && <HODSettings />}
        {activeTab === "feedback" && <FeedbackManagement />}
        {activeTab === "exam-forms" && <HODExamForms />}
        {activeTab === "scholarships" && <Scholarships />}
        {activeTab === "bus-routes" && <BusRoutes />}
        {activeTab === "exam-halls" && <ExamHalls />}
        {activeTab === "hall-allocation" && <HallAllocation />}
        {activeTab === "audit-logs" && <AuditLogs />}
        {/* {activeTab === "system-logs" && <SystemLogsDashboard />} */}
        {activeTab === "system-health" && <SystemHealthDashboard />}
        {activeTab === "manage-bookings" && <BookingManagement />}
        { activeTab === "manage-resources" && <ResourceManagement /> }
        { activeTab === "freeze-semesters" && <SemesterManagement /> }
        { activeTab === "data-locks" && <DataLocks /> }
        { activeTab === "sequence-repair" && <SequenceRepair /> }
        { activeTab === "form-insights" && <FormAbandonmentStats /> }
        { activeTab === "risk-dashboard" && <RiskDashboard /> }
        { activeTab === "workflow-admin" && <WorkflowAdmin /> }
        { activeTab === "workflow-approvals" && <WorkflowApprovals /> }
      </>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">HOD Portal</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profileDepartment}</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
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
                      if (item.id === ("reports" as TabType)) {
                        navigate("/hod/reports");
                      } else {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
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
            <button onClick={() => setActiveTab("settings")} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Settings
            </button>
            <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="relative hidden sm:block w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students, teachers, courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                {searchTerm && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {(["students", "teachers", "courses"] as const).map((group) => (
                      <div key={group} className="p-2">
                        <h4 className="font-bold text-blue-600 capitalize">{group}</h4>
                        {searchResults[group].length > 0 ? (
                          searchResults[group].map((item: any) => (
                            <div key={item._id} className="p-2 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200">
                              {item.name || item.email || item.code}
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500 dark:text-gray-400">No results found</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                {darkMode ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <button
                onClick={() => navigate("/announcements")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                {profileInitials}
              </div>
              <button onClick={fetchDashboardData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{activeLabel}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === "overview" ? "Welcome back. Here's what's happening with your department today." : `Manage ${activeLabel.toLowerCase()}.`}
            </p>
          </div>

          {/* All tab components render seamlessly through this call */}
          {renderTab()}

        </main>
      </div>
    </div>
  );
}