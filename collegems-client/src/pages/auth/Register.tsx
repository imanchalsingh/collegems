
//import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
//import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  User, Mail, Lock, GraduationCap, Users, Shield, Building2,
  Hash, ChevronRight, ArrowLeft, School, Briefcase, IdCard,
  Moon, Sun, AlertTriangle, X
} from "lucide-react";
import api from "../../api/axios";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"; 
import { useToast } from "../../hooks/useToast";

export default function Register() {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [role, setRole] = useState("student");
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [passwordStrength, setPasswordStrength] = useState<"" | "Weak" | "Medium" | "Strong">("");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

    // Add this after handleChange function
  const getPasswordStrength = (password: string): "" | "Weak" | "Medium" | "Strong" => {
    if (!password) return "";
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return "Weak";
    if (score <= 3) return "Medium";
    return "Strong";
  };

  const handleTogglePassword = () => {
    if (!showPassword) {
      setShowPassword(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShowPassword(false);
      }, 3000);
    } else {
      setShowPassword(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);
  
  const handleRegister = async () => {
    if (loading) return;

    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, role };
      if (duplicateWarning) {
        payload.overrideDuplicates = true;
      }
      const res = await api.post("/auth/register", payload);
      
      toast.success(res.data.message || "Registration successful. Please check your email to verify your account.");
      setForm({});
      setDuplicateWarning(null);
      navigate("/login");
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.isDuplicateWarning) {
        setDuplicateWarning(err.response.data);
      } else if (err.response?.data?.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
        setError(err.response.data.errors[0].msg);
      } else {
        setError(err.response?.data?.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: "student", label: "Student", icon: GraduationCap, color: "blue", description: "Access courses, assignments, and grades" },
    { value: "teacher", label: "Teacher", icon: Users, color: "amber", description: "Manage classes, assignments, and attendance" },
    { value: "parent", label: "Parent", icon: Users, color: "purple", description: "Monitor your child's academic progress" },
    { value: "hod", label: "HOD", icon: Shield, color: "emerald", description: "Oversee department and faculty" },
    { value: "parent", label: "Parent", icon: Users, color: "purple", description: "Monitor your child's progress" },
  ];

  const getRoleColor = (roleValue: string) => {
    switch (roleValue) { case "student": return "blue"; case "teacher": return "amber"; case "hod": return "emerald"; case "parent": return "purple"; default: return "blue"; }
  };

  const colorClasses = {
    blue:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    ring: "ring-blue-500",    button: "bg-blue-600 hover:bg-blue-700",    light: "bg-blue-100" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   ring: "ring-amber-500",   button: "bg-amber-600 hover:bg-amber-700",   light: "bg-amber-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-500", button: "bg-emerald-600 hover:bg-emerald-700", light: "bg-emerald-100" },
    purple:  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  ring: "ring-purple-500",  button: "bg-purple-600 hover:bg-purple-700",  light: "bg-purple-100" },
  };

  const currentColor = colorClasses[getRoleColor(role) as keyof typeof colorClasses];

  // Reusable input class
  const inputClass = "block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          {darkMode ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button onClick={() => navigate("/login")} className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>

        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-xl">
            <School className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">Create an account</h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">Join the College Management System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">

          {/* Role Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              I want to register as:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = role === option.value;
                const roleColor = colorClasses[option.color as keyof typeof colorClasses];
                return (
                  <button
                    key={option.value}
                    onClick={() => setRole(option.value)}
                    className={`relative p-3 rounded-lg border-2 transition-all ${isSelected ? `${roleColor.border} ${roleColor.bg}` : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700"}`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Icon className={`w-5 h-5 mb-1 ${isSelected ? roleColor.text : "text-gray-500 dark:text-gray-400"}`} />
                      <span className={`text-xs font-medium ${isSelected ? roleColor.text : "text-gray-600 dark:text-gray-400"}`}>
                        {option.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className={`absolute -top-1 -right-1 w-4 h-4 ${roleColor.button} rounded-full border-2 border-white flex items-center justify-center`}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {/* Common Fields */}
            <div>
              <label htmlFor="name" className={labelClass}>Full Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-gray-400" /></div>
                <input id="name" name="name" type="text" value={form.name || ""} onChange={handleChange} disabled={loading} className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`} placeholder="John Doe" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>Email Address *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-gray-400" /></div>
                <input id="email" name="email" type="email" value={form.email || ""} onChange={handleChange} disabled={loading} className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`} placeholder="you@example.com" />
              </div>
            </div>

            
            <div>
            <label htmlFor="password" className={labelClass}>Password *</label>
             <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400" /></div>
              <input id="password" name="password" type={showPassword ? "text" : "password"} value={form.password || ""} onChange={handleChange} disabled={loading} className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`} placeholder="••••••••" />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                 {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>
                
              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Password strength:</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength === "Weak" ? "text-red-500" :
                      passwordStrength === "Medium" ? "text-yellow-500" :
                      "text-green-500"
                    }`}>
                      {passwordStrength}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${
                      passwordStrength === "Weak" ? "w-1/3 bg-red-500" :
                      passwordStrength === "Medium" ? "w-2/3 bg-yellow-500" :
                      "w-full bg-green-500"
                    }`} />
                  </div>
                  {showPassword && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      🔒 Password will auto-hide in 3 seconds
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Student Fields */}
            {role === "student" && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" /> Student Information
                </h3>
                <div>
                  <label htmlFor="studentId" className={labelClass}>Student ID *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IdCard className="h-4 w-4 text-gray-400" /></div>
                    <input id="studentId" name="studentId" value={form.studentId || ""} onChange={handleChange} className={inputClass} placeholder="STU2024001" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="course" className={labelClass}>Course *</label>
                    <select id="course" name="course" value={form.course || ""} onChange={handleChange} className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="">Select</option>
                      <option value="BCA">BCA</option>
                      <option value="MCA">MCA</option>
                      <option value="BBA">BBA</option>
                      <option value="MBA">MBA</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="department" className={labelClass}>Department</label>
                    <select id="department" name="department" value={form.department || ""} onChange={handleChange} className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="">Select department (Optional)</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Business">Business</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Arts">Arts</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="semester" className={labelClass}>Semester *</label>
                    <select id="semester" name="semester" value={form.semester || ""} onChange={handleChange} className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="">Select</option>
                      {[1,2,3,4,5,6].map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Teacher Fields */}
            {role === "teacher" && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" /> Teacher Information
                </h3>
                <div>
                  <label htmlFor="teacherId" className={labelClass}>Teacher ID *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IdCard className="h-4 w-4 text-gray-400" /></div>
                    <input id="teacherId" name="teacherId" value={form.teacherId || ""} onChange={handleChange} className={inputClass} placeholder="TCH2024001" />
                  </div>
                </div>
                <div>
                  <label htmlFor="department" className={labelClass}>Department *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building2 className="h-4 w-4 text-gray-400" /></div>
                    <select id="department" name="department" value={form.department || ""} onChange={handleChange} className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="">Select department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* HOD Fields */}
            {role === "hod" && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" /> HOD Information
                </h3>
                <div>
                  <label htmlFor="departmentCode" className={labelClass}>Department Code *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Hash className="h-4 w-4 text-gray-400" /></div>
                    <input id="departmentCode" name="departmentCode" value={form.departmentCode || ""} onChange={handleChange} className={inputClass} placeholder="CS001" />
                  </div>
                </div>
                <div>
                  <label htmlFor="experience" className={labelClass}>Years of Experience</label>
                  <input id="experience" name="experience" type="number" value={form.experience || ""} onChange={handleChange} className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="10" />
                </div>
              </div>
            )}

            {/* Parent Fields */}
            {role === "parent" && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" /> Parent Information
                </h3>
                <div>
                  <label htmlFor="studentId" className={labelClass}>Child's Student ID *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IdCard className="h-4 w-4 text-gray-400" /></div>
                    <input id="studentId" name="studentId" value={form.studentId || ""} onChange={handleChange} className={inputClass} placeholder="STU2024001" />
                  </div>
                </div>
              </div>
            )}
              {/* Error Message */}
              {error && (
                <p className="text-red-500 text-sm text-center">
                  {error}
                </p>
              )}
            {/* Submit Button */}
            <button
              type="button" onClick={handleRegister} disabled={loading}
              className={`w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${currentColor.button} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6`}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Creating account...</span></>
              ) : (
                <><span>Create {role} account</span><ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
  By registering, you agree to our{" "}
  <button className="text-blue-600 hover:text-blue-500 font-medium">
    Terms of Service
  </button>{" "}
  and{" "}
  <button
    type="button"
    onClick={() => navigate("/privacy")}
    className="text-blue-600 hover:text-blue-500 font-medium"
  >
    Privacy Policy
  </button>
</p>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="font-medium text-blue-600 hover:text-blue-500">Sign in here</button>
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} College Management System. All rights reserved.
          </p>
        </div>
      </div>

      {/* Duplicate Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold">Potential Duplicate Found</h3>
              </div>
              <button onClick={() => setDuplicateWarning(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                We found existing users that match the details you provided. Creating a duplicate may cause issues.
              </p>
              <div className="max-h-48 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                {duplicateWarning.matches?.map((match: any, idx: number) => (
                  <div key={idx} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 bg-gray-50 dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{match.name} ({match.role})</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Matched on: {match.matchReason}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegister}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}