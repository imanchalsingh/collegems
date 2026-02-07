import {
  BookOpen,
  Calendar,
  FileText,
  Bell,
  Clock,
  LogIn,
  UserPlus,
  GraduationCap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MainDashboard() {
  const navigate = useNavigate();

  // Dashboard cards data
  const dashboardCards = [
    {
      id: 1,
      title: "Results",
      description: "View your academic results and grades",
      icon: <FileText size={28} />,
      count: "4 Subjects",
      bgColor: "rgba(189, 35, 35, 0.1)",
      borderColor: "#bd2323",
      iconColor: "#bd2323",
      routes: "/results",
    },
    {
      id: 2,
      title: "Exam Schedule",
      description: "Check upcoming exam dates and venues",
      icon: <Calendar size={28} />,
      count: "2 Upcoming",
      bgColor: "rgba(10, 41, 94, 0.1)",
      borderColor: "#0a295e",
      iconColor: "#0a295e",
      routes: "/examschedule",
    },
    {
      id: 3,
      title: "Courses",
      description: "Browse and enroll in courses",
      icon: <BookOpen size={28} />,
      count: "6 Enrolled",
      bgColor: "rgba(230, 194, 53, 0.1)",
      borderColor: "#e6c235",
      iconColor: "#e6c235",
      routes: "/courses",
    },
    {
      id: 4,
      title: "Events",
      description: "College events and activities",
      icon: <Bell size={28} />,
      count: "3 New",
      bgColor: "rgba(189, 35, 35, 0.1)",
      borderColor: "#bd2323",
      iconColor: "#bd2323",
      routes: "/events",
    },
    {
      id: 5,
      title: "Timetable",
      description: "Daily class schedule",
      icon: <Clock size={28} />,
      count: "Current Week",
      bgColor: "rgba(10, 41, 94, 0.1)",
      borderColor: "#0a295e",
      iconColor: "#0a295e",
      routes: "/timetable",
    },
    {
      id: 6,
      title: "Faculty",
      description: "Meet your professors",
      icon: <GraduationCap size={28} />,
      count: "12 Teachers",
      bgColor: "rgba(230, 194, 53, 0.1)",
      borderColor: "#e6c235",
      iconColor: "#e6c235",
      routes: "/faculty",
    },
  ];

  // Handle card click
  const handleCardClick = (cardId: number) => {
    const card = dashboardCards.find((c) => c.id === cardId);
    if (card) {
      navigate(card.routes);
    }
  };

  // Handle login
  const handleLogin = () => {
    navigate("/login");
  };

  // Handle register
  const handleRegister = () => {
    navigate("/register");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <div className="shrink-0 flex items-center">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                  style={{
                    background: "linear-gradient(135deg, #bd2323, #0a295e)",
                    border: "2px solid #e6c235",
                  }}
                >
                  <GraduationCap size={24} />
                </div>
                <span className="text-xl font-bold">
                  College<span style={{ color: "#e6c235" }}>Portal</span>
                </span>
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center space-x-4">
              <>
                {/* Login/Register buttons navbar */}
                <button
                  onClick={() => handleLogin()}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #0a295e, #bd2323)",
                    border: "1px solid #e6c235",
                  }}
                >
                  <LogIn size={18} className="mr-2" />
                  Login
                </button>
                <button
                  onClick={handleRegister}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: "#e6c235",
                    color: "#000000",
                  }}
                >
                  <UserPlus size={18} className="mr-2" />
                  Register
                </button>
              </>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Dashboard Cards */}
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <BookOpen className="mr-2" style={{ color: "#e6c235" }} />
              Quick Access
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {dashboardCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className="bg-gray-800 p-5 rounded-xl text-left hover:transform hover:scale-[1.02] transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
                  style={{
                    border: `2px solid ${card.borderColor}`,
                    backgroundColor: card.bgColor,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div style={{ color: card.iconColor }}>{card.icon}</div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-700">
                      {card.count}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{card.title}</h3>
                  <p className="text-gray-400 text-sm">{card.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Bottom Section - Notifications */}
        <div className="mt-8 bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center">
              <Bell className="mr-2" style={{ color: "#e6c235" }} />
              Important Notifications
            </h3>
            <span className="text-sm text-gray-400">View All</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              className="p-4 rounded-lg border"
              style={{ borderColor: "#bd2323" }}
            >
              <div className="font-medium mb-1">Fee Payment Deadline</div>
              <div className="text-sm text-gray-400">
                Last date: Nov 30, 2023
              </div>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{ borderColor: "#0a295e" }}
            >
              <div className="font-medium mb-1">Library Fine</div>
              <div className="text-sm text-gray-400">Clear dues by Dec 5</div>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{ borderColor: "#e6c235" }}
            >
              <div className="font-medium mb-1">Project Submission</div>
              <div className="text-sm text-gray-400">
                Final year projects due Dec 10
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mr-2"
                  style={{
                    background: "linear-gradient(135deg, #bd2323, #0a295e)",
                  }}
                >
                  <GraduationCap size={18} />
                </div>
                <span className="font-bold">CollegePortal v1.0</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                © 2026 College Management System. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                Contact
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                Help
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
