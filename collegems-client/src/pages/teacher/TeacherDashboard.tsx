import { useEffect, useState } from "react";
import api from "../../api/axios";
import TeacherAttendance from "./Attendance";
import {
  Users,
  BarChart3,
  FileText,
  Clock,
  Bell,
  Search,
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  BookMarked,
  Book,
  Coins,
  Menu,
  X,
  ChevronRight,
  Calendar,
  LogOut,
  Settings,
  GraduationCap,
} from "lucide-react";
import HodCourses from "../../components/Courses";
import TeacherAssignments from "./Assignment";
import Students from "../../components/Students";
import ExamSchedule from "../../components/ExamSchedule";
import Classes from "../../components/Classes";
import TeacherFee from "./Teacherfee";
import Salary from "./Salary";
import Syllabus from "../../components/Syllabus";
import MyAttendance from "./MyAttendance";

export default function TeacherDashboard() {
  const [data, setData] = useState<any>(null);
  const [courses, setCourses] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 1,
      type: "assignment",
      message: "New assignment submission from Student A",
      time: "2 hours ago",
    },
    {
      id: 2,
      type: "announcement",
      message: "Department meeting scheduled",
      time: "1 day ago",
    },
    {
      id: 3,
      type: "attendance",
      message: "Attendance report ready",
      time: "2 days ago",
    },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, coursesRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/courses/all"),
      ]);

      setData(dashboardRes.data);
      setCourses(coursesRes.data);

      setUpcomingClasses([
        {
          id: 1,
          course: "Mathematics 101",
          time: "10:00 AM",
          room: "Room 301",
          status: "upcoming",
          students: 28,
        },
        {
          id: 2,
          course: "Physics 201",
          time: "2:00 PM",
          room: "Lab 204",
          status: "upcoming",
          students: 24,
        },
        {
          id: 3,
          course: "Computer Science 301",
          time: "4:00 PM",
          room: "Room 105",
          status: "completed",
          students: 32,
        },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigationItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "myattendance", label: "My Attendance", icon: ClipboardList },
    { id: "courses", label: "My Courses", icon: BookMarked },
    { id: "assignments", label: "Assignments", icon: CheckSquare },
    { id: "attendance", label: "Attendance", icon: ClipboardList },
    { id: "examschedules", label: "Exam Schedules", icon: Calendar },
    { id: "fees", label: "Fees", icon: BarChart3 },
    { id: "salary", label: "Salary", icon: Coins },
    { id: "classes", label: "Classes", icon: Book },
    { id: "syllabus", label: "Syllabus", icon: FileText },
    { id: "students", label: "Students", icon: Users },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <FileText className="w-4 h-4" />;
      case "announcement":
        return <Bell className="w-4 h-4" />;
      case "attendance":
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "assignment":
        return "bg-blue-50 text-blue-700";
      case "announcement":
        return "bg-amber-50 text-amber-700";
      case "attendance":
        return "bg-emerald-50 text-emerald-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

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
                <h2 className="text-xl font-bold text-gray-900">Teacher Portal</h2>
                <p className="text-sm text-gray-500 mt-1">Faculty Dashboard</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Teacher Info */}
            <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {data?.user?.name?.charAt(0) || "T"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {data?.user?.name || "Teacher"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {data?.user?.email || "teacher@college.edu"}
                </p>
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
                    <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
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
                    placeholder="Search courses, students..."
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
                  />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
                </button>
                <button
                  onClick={fetchDashboardData}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Refresh"
                >
                  <Clock className="w-4 h-4 text-gray-600" />
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
                ? `Welcome back, ${data?.user?.name || "Teacher"}. Here's your teaching overview for today.`
                : `Manage your ${activeTab.toLowerCase()}`}
            </p>
          </div>

          {/* Content Area */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Courses", value: courses.length, icon: BookMarked, color: "blue" },
                  { label: "Total Students", value: "124", icon: Users, color: "amber" },
                  { label: "Classes Today", value: "4", icon: Clock, color: "emerald" },
                  { label: "Pending Tasks", value: "8", icon: CheckSquare, color: "purple" },
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
                          <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${colorClasses}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Courses */}
                <div className="lg:col-span-2 space-y-6">
                  {/* My Courses */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
                      <button 
                        onClick={() => setActiveTab("courses")}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        View all
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {courses.slice(0, 3).map((course, index) => (
                        <div
                          key={course._id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <BookMarked className="w-4 h-4 text-blue-700" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{course.name}</p>
                              <p className="text-sm text-gray-500">Course Code: CS{101 + index}</p>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">32 students</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Upcoming Classes */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
                    <div className="space-y-3">
                      {upcomingClasses.map((classItem) => (
                        <div
                          key={classItem.id}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900">{classItem.course}</h3>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                classItem.status === "upcoming"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {classItem.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {classItem.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {classItem.students} students
                            </div>
                            <span>• {classItem.room}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        3 new
                      </span>
                    </div>
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "myattendance" && <MyAttendance />}

          {activeTab === "courses" && <HodCourses />}
          {activeTab === "assignments" && (
            <TeacherAssignments
              courseId={courses[0]?._id || "default-course-id"}
            />
          )}
          {activeTab === "attendance" && <TeacherAttendance />}
          {activeTab === "examschedules" && <ExamSchedule />}
          {activeTab === "fees" && <TeacherFee />}
          {activeTab === "salary" && <Salary />}
          {activeTab === "classes" && <Classes />}
          {activeTab === "syllabus" && <Syllabus />}
          {activeTab === "students" && <Students />}
        </main>
      </div>
    </div>
  );
}