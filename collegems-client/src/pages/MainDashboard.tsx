import {
  BookOpen,
  Calendar,
  FileText,
  Bell,
  Clock,
  LogIn,
  UserPlus,
  ChevronRight,
  Home,
  Users,
  Library,
  Award,
  CalendarDays,
  AlertCircle,
  School,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function MainDashboard() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Dashboard cards data
  const dashboardCards = [
    {
      id: 1,
      title: "Academic Results",
      description: "View your semester grades and performance",
      icon: FileText,
      count: "4 Subjects",
      color: "blue",
      route: "/results",
    },
    {
      id: 2,
      title: "Examination Schedule",
      description: "Upcoming exams dates and venues",
      icon: Calendar,
      count: "2 Upcoming",
      color: "amber",
      route: "/examschedule",
    },
    {
      id: 3,
      title: "Course Catalog",
      description: "Browse and manage your enrolled courses",
      icon: BookOpen,
      count: "6 Enrolled",
      color: "emerald",
      route: "/courses",
    },
    {
      id: 4,
      title: "Campus Events",
      description: "Upcoming activities and events",
      icon: Bell,
      count: "3 New",
      color: "purple",
      route: "/events",
    },
    {
      id: 5,
      title: "Class Schedule",
      description: "Daily timetable and class details",
      icon: Clock,
      count: "This Week",
      color: "rose",
      route: "/timetable",
    },
    {
      id: 6,
      title: "Faculty Directory",
      description: "Connect with your professors",
      icon: Users,
      count: "12 Teachers",
      color: "cyan",
      route: "/faculty",
    },
  ];

  // Quick stats
  const quickStats = [
    { label: "Attendance", value: "92%", icon: Clock, color: "blue" },
    { label: "CGPA", value: "3.8", icon: Award, color: "amber" },
    {
      label: "Pending Assignments",
      value: "3",
      icon: FileText,
      color: "purple",
    },
    { label: "Library Books", value: "2", icon: Library, color: "emerald" },
  ];

  // Notifications data
  const notifications = [
    {
      id: 1,
      title: "Fee Payment Reminder",
      message: "Last date for fee submission is Nov 30, 2023",
      time: "2 days left",
      color: "blue",
      icon: AlertCircle,
    },
    {
      id: 2,
      title: "Library Fine Notice",
      message: "Clear your pending dues by Dec 5",
      time: "1 week left",
      color: "amber",
      icon: Library,
    },
    {
      id: 3,
      title: "Project Submission",
      message: "Final year projects due on Dec 10",
      time: "2 weeks left",
      color: "purple",
      icon: FileText,
    },
  ];

  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: "text-blue-600",
      hover: "hover:border-blue-300",
      light: "bg-blue-100",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: "text-amber-600",
      hover: "hover:border-amber-300",
      light: "bg-amber-100",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: "text-emerald-600",
      hover: "hover:border-emerald-300",
      light: "bg-emerald-100",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      icon: "text-purple-600",
      hover: "hover:border-purple-300",
      light: "bg-purple-100",
    },
    rose: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      icon: "text-rose-600",
      hover: "hover:border-rose-300",
      light: "bg-rose-100",
    },
    cyan: {
      bg: "bg-cyan-50",
      text: "text-cyan-700",
      border: "border-cyan-200",
      icon: "text-cyan-600",
      hover: "hover:border-cyan-300",
      light: "bg-cyan-100",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <School className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-gray-900">
                  College<span className="text-blue-600">Portal</span>
                </span>
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogIn size={16} />
                Sign In
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <UserPlus size={16} />
                Register
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, Student!
          </h1>
          <p className="text-gray-500 mt-1">
            Here's your academic overview and upcoming activities
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            const colors =
              colorClasses[stat.color as keyof typeof colorClasses];
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${colors.light}`}>
                    <Icon className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {stat.value}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Main Dashboard Cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-gray-500" />
              Quick Access
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardCards.map((card) => {
              const Icon = card.icon;
              const colors =
                colorClasses[card.color as keyof typeof colorClasses];
              const isHovered = hoveredCard === card.id;

              return (
                <button
                  key={card.id}
                  onClick={() => navigate(card.route)}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`
                    bg-white rounded-xl border-2 p-5 text-left
                    transition-all duration-200
                    ${colors.border} ${colors.hover}
                    ${isHovered ? "shadow-lg scale-[1.02]" : "shadow-sm"}
                  `}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${colors.bg}`}>
                      <Icon className={`w-6 h-6 ${colors.icon}`} />
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}
                    >
                      {card.count}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-500">{card.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section - Notifications & Updates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Important Notifications */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-gray-500" />
                  Important Notifications
                </h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {notifications.map((notification) => {
                  const Icon = notification.icon;
                  const colors =
                    colorClasses[
                      notification.color as keyof typeof colorClasses
                    ];
                  return (
                    <div
                      key={notification.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`w-5 h-5 ${colors.icon}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}
                          >
                            {notification.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <CalendarDays className="w-5 h-5 text-gray-500" />
                Upcoming Events
              </h3>
              <div className="space-y-3">
                {[
                  { title: "Tech Symposium", date: "Dec 15", color: "blue" },
                  { title: "Sports Meet", date: "Dec 18", color: "amber" },
                  { title: "Cultural Fest", date: "Dec 22", color: "purple" },
                ].map((event, index) => {
                  const colors =
                    colorClasses[event.color as keyof typeof colorClasses];
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                    >
                      <span className="text-sm text-gray-700">
                        {event.title}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}
                      >
                        {event.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                  <School className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900">
                  CollegePortal
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                © 2026 College Management System. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Contact
              </a>
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Help
              </a>
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                FAQ
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
