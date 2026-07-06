import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  Mail, Lock, Eye, EyeOff, LogIn, ChevronRight,
  Shield, School, Users, BookOpen, Moon, Sun,
} from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../hooks/useToast";
import ThemeSwitcher from "../../components/ThemeSwitcher";

export default function Login() {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const handleLogin = async () => {
    if (!email || !password) {
      toast.warning("Please enter both email and password");
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("userData", JSON.stringify(res.data.user));
      if (rememberMe) localStorage.setItem("rememberEmail", email);
      else localStorage.removeItem("rememberEmail");
      
      toast.success(`Welcome back, ${res.data.user.name || 'User'}!`);
      
      const role = res.data.user.role;
      const routes: Record<string, string> = { student: "/student/dashboard", teacher: "/teacher/dashboard", hod: "/hod/dashboard", parent: "/parent/dashboard" };
      navigate(routes[role] || "/");
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.isEmailVerified === false) {
        setUnverifiedEmail(err.response.data.email || email);
      } else {
        setUnverifiedEmail("");
      }
      const errorMessage =
        err.response?.data?.message ||
        "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleLogin(); };

  const roleHighlights = [
    { role: "Student", icon: Users, color: "blue" },
    { role: "Teacher", icon: BookOpen, color: "amber" },
    { role: "Parent", icon: Users, color: "purple" },
    { role: "HOD", icon: Shield, color: "emerald" },
    { role: "Parent", icon: Users, color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">

      {/* Theme Toggle - top right */}
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-xl">
            <School className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          College Management System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">

          {/* Role Highlights */}
          <div className="flex justify-center gap-4 mb-8">
            {roleHighlights.map((item, index) => {
              const Icon = item.icon;
              const colors = {
                blue: "bg-blue-50 text-blue-700",
                amber: "bg-amber-50 text-amber-700",
                emerald: "bg-emerald-50 text-emerald-700",
                purple: "bg-purple-50 text-purple-700",
              }[item.color as "blue" | "amber" | "emerald" | "purple"];
              return (
                <div key={index} className="text-center">
                  <div className={`w-10 h-10 ${colors} rounded-lg flex items-center justify-center mx-auto mb-1`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.role}</span>
                </div>
              );
            })}
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
                autoComplete="email"
              />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
        
                <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={loading} className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                  {showPassword
                    ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me" type="checkbox" checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>
              <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="button" onClick={handleLogin} disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Signing in...</span></>
              ) : (
                <><LogIn className="w-4 h-4" /><span>Sign in</span></>
              )}
            </button>

            {/* Unverified Email Resend Block */}
            {unverifiedEmail && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3 text-center">
                  Email not verified. You need to verify your email to log in.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (resending) return;
                    setResending(true);
                    try {
                      await api.post("/auth/resend-verification", { email: unverifiedEmail });
                      toast.success("Verification email sent! Please check your inbox.");
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || "Failed to resend email.");
                    } finally {
                      setResending(false);
                    }
                  }}
                  disabled={resending}
                  className="w-full flex justify-center py-2 px-4 border border-amber-300 dark:border-amber-700 rounded-md shadow-sm text-sm font-medium text-amber-700 dark:text-amber-300 bg-white dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-colors"
                >
                  {resending ? "Sending..." : "Resend Verification Email"}
                </button>
              </div>
            )}
          </form>

          {/* Register Link */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  New to the system?
                </span>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate("/register")}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors"
              >
                <span>Create an account</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>© {new Date().getFullYear()} CMS</span>
            <span>•</span>
            <span>Secure Login</span>
            <span>•</span>
            <span>Version 2.0</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Select your role during registration for appropriate access
          </p>
        </div>
      </div>
    </div>
  );
}