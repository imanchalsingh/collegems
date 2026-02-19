import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ChevronRight,
  Shield,
  School,
  Users,
  BookOpen,
} from "lucide-react";
import api from "../../api/axios";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("userData", JSON.stringify(res.data.user));

      if (rememberMe) {
        localStorage.setItem("rememberEmail", email);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      const role = res.data.user.role;
      const routes: Record<string, string> = {
        student: "/student/dashboard",
        teacher: "/teacher/dashboard",
        hod: "/hod/dashboard",
      };

      navigate(routes[role] || "/");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        "Login failed. Please check your credentials.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const roleHighlights = [
    { role: "Student", icon: Users, color: "blue" },
    { role: "Teacher", icon: BookOpen, color: "amber" },
    { role: "HOD", icon: Shield, color: "emerald" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo/Brand */}
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-xl">
            <School className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          College Management System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          {/* Role Highlights */}
          <div className="flex justify-center gap-4 mb-8">
            {roleHighlights.map((item, index) => {
              const Icon = item.icon;
              const colors = {
                blue: "bg-blue-50 text-blue-700",
                amber: "bg-amber-50 text-amber-700",
                emerald: "bg-emerald-50 text-emerald-700",
              }[item.color];

              return (
                <div key={index} className="text-center">
                  <div
                    className={`w-10 h-10 ${colors} rounded-lg flex items-center justify-center mx-auto mb-1`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {item.role}
                  </span>
                </div>
              );
            })}
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Remember me
                </label>
              </div>

              <button
                type="button"
                onClick={() => alert("Password reset feature coming soon")}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  New to the system?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate("/register")}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <span>Create an account</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} CMS</span>
            <span>•</span>
            <span>Secure Login</span>
            <span>•</span>
            <span>Version 2.0</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Select your role during registration for appropriate access
          </p>
        </div>
      </div>
    </div>
  );
}
