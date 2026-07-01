import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutGrid, Users, GraduationCap, BookOpen, Building2, FileText,
  Wallet, DollarSign, Calendar, Menu, X, RefreshCw, ChevronRight,
  Bell, Search, UserCircle, LogOut, Settings, CalendarDays,
  Moon, Sun,
} from "lucide-react";
import api from "../api/axios";
import Students from "../common-components-management/Students";
import HODSalary from "../hod-components/Salary";
import HODTeacherAttendance from "../hod-components/TeacherAttendance";
import AcademicCalendar from "../common-components-management/AcademicCalendar";
import Teachers from "../hod-components/Teachers";
import Library from "../common-components-management/Library";
import HODSettings from "../hod-components/Settings";
import HODCourses from "../hod-components/Courses";
import HODExamForms from "../hod-components/ExamForms";
import Visitors from "../hod-components/visitors";

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
  | "events"
  | "academic-calendar"
  | "library"
  | "settings"
  | "reports"
  | "exam-forms"
  | "visitors";

interface Data {
  cards: Array<{ title: string; value: number }>;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalClassess: number;
}

interface ProfileData {
  name: string; email: string; phone?: string;
  department?: string; departmentCode?: string;
  role: string; avatarUrl?: string;
}

export default function HODDashboard() {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<Date | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [searchData, setSearchData] = useState({
    students: [],
    teachers: [],
    courses: [],
  });

  const [searchResults, setSearchResults] = useState({
    students: [],
    teachers: [],
    courses: [],
  });

  useEffect(() => {
    fetchDashboardData();
    fetchProfileData();
    fetchSearchData();
    const refreshProfile = () => fetchProfileData(true);
    const profileInterval = window.setInterval(refreshProfile, 15000);
    window.addEventListener("focus", refreshProfile);
    return () => {
      window.clearInterval(profileInterval);
      window.removeEventListener("focus", refreshProfile);
    };
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

  const fetchProfileData = async (silent = false) => {
    try {
      if (silent) setProfileRefreshing(true);
      else setProfileLoading(true);
      const res = await api.get("/users/me");
      const user = res.data;
      if (user?.role !== "hod") {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userData");
        navigate("/login", { replace: true });
        return;
      }
      setProfile({
        name: user.name || "", email: user.email || "",
        phone: user.phone || "", department: user.department || "",
        departmentCode: user.departmentCode || "", role: user.role || "hod",
        avatarUrl: user.avatarUrl || user.profilePicture || user.photo,
      });
      setProfileError(null);
      setProfileUpdatedAt(new Date());
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userData");
        navigate("/login", { replace: true });
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
        api.get("/users/students"),
        api.get("/users/teachers"),
        api.get("/courses/all"),
      ]);

      setSearchData({
        students: studentsRes.data || [],
        teachers: teachersRes.data || [],
        courses: coursesRes.data || [],
      });
    } catch (error) {
      console.error("Error loading search data:", error);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults({
        students: [],
        teachers: [],
        courses: [],
      });
      return;
    }

    const query = searchTerm.toLowerCase();

    setSearchResults({
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
    });
  }, [searchTerm, searchData]);
  // Sign out handler for HOD
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userData");
    navigate("/login", { replace: true });
  };

  const profileDisplayDepartment = profile?.department || profile?.departmentCode || "Not set";
  const profileInitials = profile?.name?.split(" ").filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("").slice(0, 2);

  const navigationItems = [
    { id: "overview" as TabType, label: "Overview", icon: LayoutGrid },
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
    { id: "exam-forms" as TabType, label: "Exam Forms", icon: FileText },
    {id: "visitors" as TabType,label: "Visitors",icon: Users,},
  ];

  const statsCards = data?.cards.map((card, index) => ({
    ...card,
    icon: [Users, GraduationCap, BookOpen, Building2][index % 4],
    color: index === 0 ? "blue" : index === 1 ? "amber" : index === 2 ? "emerald" : "purple",
  }));

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

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Bell className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to load dashboard</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">There was an error fetching your dashboard data.</p>
          <button onClick={fetchDashboardData} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">HOD Portal</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {profileLoading ? "Loading department..." : profileDisplayDepartment}
                </p>
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
                      if (item.id === "reports") {
                        navigate("/hod/reports");
                      } else {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }
                    }}
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
              <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Settings
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
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
                    <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">

                      <div className="p-2">
                        <h4 className="font-bold text-blue-600">Students</h4>
                        {searchResults.students.map((student: any) => (
                          <div key={student._id} className="p-2 border-b">
                            {student.name}
                          </div>
                        ))}
                      </div>

                      <div className="p-2">
                        <h4 className="font-bold text-green-600">Faculty</h4>
                        {searchResults.teachers.map((teacher: any) => (
                          <div key={teacher._id} className="p-2 border-b">
                            {teacher.name}
                          </div>
                        ))}
                      </div>

                      <div className="p-2">
                        <h4 className="font-bold text-purple-600">Courses</h4>
                        {searchResults.courses.map((course: any) => (
                          <div key={course._id} className="p-2 border-b">
                            {course.name}
                          </div>
                        ))}
                      </div>

                      {searchResults.students.length === 0 &&
                        searchResults.teachers.length === 0 &&
                        searchResults.courses.length === 0 && (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No students, faculty, or courses found.
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Theme Toggle */}
                <button onClick={toggleTheme} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  {darkMode ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-gray-600" />}
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
                </button>
                <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name || "HOD"} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold">
                      {profileInitials || <UserCircle className="w-4 h-4" />}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                    {profile?.name || (profileLoading ? "Loading..." : "HOD")}
                  </span>
                </button>
                <button onClick={fetchDashboardData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
                  <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>

        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {navigationItems.find((item) => item.id === activeTab)?.label}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === "overview"
                ? `Welcome back${profile?.name ? `, ${profile.name}` : ""}. Here's what's happening with your department today.`
                : `Manage your department's ${activeTab.toLowerCase()}`}
            </p>
          </div>

          {activeTab === "overview" && (
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
                    blue: "bg-blue-50 text-blue-700",
                    amber: "bg-amber-50 text-amber-700",
                    emerald: "bg-emerald-50 text-emerald-700",
                    purple: "bg-purple-50 text-purple-700",
                  }[card.color];
                  return (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.title}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${colorClasses}`}><Icon className="w-5 h-5" /></div>
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

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Generate Reports", icon: FileText, color: "blue", onClick: () => navigate("/hod/reports") },
                    { label: "View Students", icon: GraduationCap, color: "amber", onClick: () => setActiveTab("students") },
                    { label: "Manage Courses", icon: BookOpen, color: "emerald", onClick: () => setActiveTab("courses") },
                  ].map((action, index) => {
                    const Icon = action.icon;
                    const colorClasses = {
                      blue: "bg-blue-50 text-blue-700 hover:bg-blue-100",
                      amber: "bg-amber-50 text-amber-700 hover:bg-amber-100",
                      emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                    }[action.color as "blue" | "amber" | "emerald"];
                    return (
                      <button key={index} onClick={action.onClick} className={`flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors ${colorClasses}`}>
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-700"><Icon className="w-5 h-5" /></div>
                        <span className="font-medium">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
          {activeTab === "exam-forms" && <HODExamForms />}
          {activeTab === "visitors" && <Visitors />}
        </main>
      </div>
    </div>
  );
}