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
} from "lucide-react";
import HodCourses from "../../components/Courses";
import TeacherAssignments from "./Assignment";
import Students from "../../components/Students";
import Assignment from "../students/Assignment";
import ExamSchedule from "../../components/ExamSchedule";

export default function TeacherDashboard() {
  const [data, setData] = useState<any>(null);
  const [courses, setCourses] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
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
  // useEffect(() => {
  //   const fetchCourses = async () => {
  //     try {
  //       const res = await api.get("/courses");
  //       setCourses(res.data);
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   };
  //   fetchCourses();
  // }, []);
  // Tab state
  const [activeTab, setActiveTab] = useState("overview");

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

      // Mock upcoming classes data
      setUpcomingClasses([
        {
          id: 1,
          course: "Mathematics",
          time: "10:00 AM",
          room: "Room 301",
          status: "upcoming",
        },
        {
          id: 2,
          course: "Physics",
          time: "2:00 PM",
          room: "Lab 204",
          status: "upcoming",
        },
        {
          id: 3,
          course: "Computer Science",
          time: "4:00 PM",
          room: "Room 105",
          status: "completed",
        },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Tab configuration
  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "courses", label: "My Courses", icon: BookMarked },
    { id: "assignments", label: "Assignments", icon: CheckSquare },
    { id: "attendance", label: "Attendance", icon: ClipboardList },
    { id: "examschedules", label: "Exam Schedules", icon: FileText },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "students", label: "Students", icon: Users },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#bd2323]"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <p className="text-gray-400 text-sm">
              Welcome back, {data?.user?.name || "Teacher"}!
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search courses, students..."
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323]"
              />
            </div>

            <button className="relative p-2 hover:bg-gray-700 rounded-lg">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-linear-to-r from-[#bd2323] to-[#0a295e] flex items-center justify-center">
                <span className="font-semibold">T</span>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {data?.user?.name || "Teacher"}
                </p>
                <p className="text-xs text-gray-400">
                  {data?.user?.email || "teacher@college.edu"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 min-h-[calc(100vh-80px)] p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">SCMS</h2>
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white shadow-lg"
                      : "text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Recent Courses */}

                  <HodCourses />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Upcoming Classes */}
                  <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    <h3 className="font-bold text-lg mb-4">Upcoming Classes</h3>
                    <div className="space-y-3">
                      {upcomingClasses.map((classItem) => (
                        <div
                          key={classItem.id}
                          className={`p-4 rounded-xl ${classItem.status === "upcoming" ? "bg-gray-700/50" : "bg-gray-900/50"} border border-gray-600`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">
                                {classItem.course}
                              </h4>
                              <div className="flex items-center text-sm text-gray-400 mt-1">
                                <Clock className="w-3 h-3 mr-1" />
                                {classItem.time}
                                <span className="mx-2">•</span>
                                {classItem.room}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs ${classItem.status === "upcoming" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}
                            >
                              {classItem.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">Notifications</h3>
                      <span className="text-xs text-gray-400">3 unread</span>
                    </div>
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer"
                        >
                          <div className="flex items-start">
                            <div
                              className={`p-2 rounded-lg mr-3 ${
                                notification.type === "assignment"
                                  ? "bg-blue-500/20"
                                  : notification.type === "announcement"
                                    ? "bg-[#e6c235]/20"
                                    : "bg-green-500/20"
                              }`}
                            >
                              {notification.type === "assignment" && (
                                <FileText className="w-4 h-4" />
                              )}
                              {notification.type === "announcement" && (
                                <Bell className="w-4 h-4" />
                              )}
                              {notification.type === "attendance" && (
                                <BarChart3 className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "courses" && <HodCourses />}

          {activeTab === "assignments" && (
            <TeacherAssignments
              courseId={courses[0]?._id || "default-course-id"}
            />
          )}
          {activeTab === "attendance" && <TeacherAttendance />}
          {activeTab === "examschedules" && (
            <div className="space-y-6">
              <ExamSchedule />
            </div>
          )}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-2xl font-bold mb-6">Analytics & Reports</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-700/30 rounded-xl p-5">
                    <h3 className="font-bold text-lg mb-4">
                      Attendance Reports
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium">Monthly Report</p>
                          <p className="text-sm text-gray-400">November 2024</p>
                        </div>
                        <button className="px-3 py-1 bg-[#e6c235] text-black rounded text-sm">
                          Download
                        </button>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium">Course-wise Report</p>
                          <p className="text-sm text-gray-400">All courses</p>
                        </div>
                        <button className="px-3 py-1 bg-[#0a295e] text-white rounded text-sm">
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-xl p-5">
                    <h3 className="font-bold text-lg mb-4">
                      Performance Analytics
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Overall Attendance Rate</span>
                          <span className="font-bold text-[#10b981]">94%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-[#10b981] h-2 rounded-full"
                            style={{ width: "94%" }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Assignment Submission Rate</span>
                          <span className="font-bold text-[#e6c235]">87%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-[#e6c235] h-2 rounded-full"
                            style={{ width: "87%" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "students" && <Students />}
        </div>
      </div>
    </div>
  );
}
