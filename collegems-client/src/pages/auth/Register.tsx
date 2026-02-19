import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  GraduationCap,
  Users,
  Shield,
  BookOpen,
  Building2,
  Hash,
  ChevronRight,
  ArrowLeft,
  School,
  Briefcase,
  IdCard,
} from "lucide-react";
import api from "../../api/axios";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    if (loading) return;

    if (!form.name || !form.email || !form.password) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", { ...form, role });
      alert("Registration successful! Please login with your credentials.");
      navigate("/login");
      setForm({});
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { 
      value: "student", 
      label: "Student", 
      icon: GraduationCap,
      color: "blue",
      description: "Access courses, assignments, and grades"
    },
    { 
      value: "teacher", 
      label: "Teacher", 
      icon: Users,
      color: "amber",
      description: "Manage classes, assignments, and attendance"
    },
    { 
      value: "hod", 
      label: "HOD", 
      icon: Shield,
      color: "emerald",
      description: "Oversee department and faculty"
    },
  ];

  const getRoleColor = (roleValue: string) => {
    switch(roleValue) {
      case "student": return "blue";
      case "teacher": return "amber";
      case "hod": return "emerald";
      default: return "blue";
    }
  };

  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      ring: "ring-blue-500",
      button: "bg-blue-600 hover:bg-blue-700",
      light: "bg-blue-100",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      ring: "ring-amber-500",
      button: "bg-amber-600 hover:bg-amber-700",
      light: "bg-amber-100",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      ring: "ring-emerald-500",
      button: "bg-emerald-600 hover:bg-emerald-700",
      light: "bg-emerald-100",
    },
  };

  const currentColor = colorClasses[getRoleColor(role) as keyof typeof colorClasses];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={() => navigate("/login")}
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>

        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-xl">
            <School className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join the College Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          {/* Role Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              I want to register as:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = role === option.value;
                const roleColor = colorClasses[option.color as keyof typeof colorClasses];

                return (
                  <button
                    key={option.value}
                    onClick={() => setRole(option.value)}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? `${roleColor.border} ${roleColor.bg}` 
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Icon className={`w-5 h-5 mb-1 ${isSelected ? roleColor.text : 'text-gray-500'}`} />
                      <span className={`text-xs font-medium ${isSelected ? roleColor.text : 'text-gray-600'}`}>
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name || ""}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email || ""}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password || ""}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Role-specific Fields */}
            {role === "student" && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Student Information
                </h3>
                
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                    Student ID *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IdCard className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="studentId"
                      name="studentId"
                      value={form.studentId || ""}
                      onChange={handleChange}
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      placeholder="STU2024001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
                      Course *
                    </label>
                    <select
                      id="course"
                      name="course"
                      value={form.course || ""}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    >
                      <option value="">Select</option>
                      <option value="BCA">BCA</option>
                      <option value="MCA">MCA</option>
                      <option value="BBA">BBA</option>
                      <option value="MBA">MBA</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                      Semester *
                    </label>
                    <select
                      id="semester"
                      name="semester"
                      value={form.semester || ""}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    >
                      <option value="">Select</option>
                      {[1,2,3,4,5,6].map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {role === "teacher" && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  Teacher Information
                </h3>
                
                <div>
                  <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">
                    Teacher ID *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IdCard className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="teacherId"
                      name="teacherId"
                      value={form.teacherId || ""}
                      onChange={handleChange}
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50"
                      placeholder="TCH2024001"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      id="department"
                      name="department"
                      value={form.department || ""}
                      onChange={handleChange}
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50"
                    >
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

            {role === "hod" && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  HOD Information
                </h3>
                
                <div>
                  <label htmlFor="departmentCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Department Code *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="departmentCode"
                      name="departmentCode"
                      value={form.departmentCode || ""}
                      onChange={handleChange}
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
                      placeholder="CS001"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    id="experience"
                    name="experience"
                    type="number"
                    value={form.experience || ""}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
                    placeholder="10"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className={`
                w-full flex justify-center items-center gap-2 py-2.5 px-4 
                border border-transparent rounded-lg shadow-sm text-sm font-medium text-white
                ${currentColor.button}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${currentColor.ring}
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                mt-6
              `}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create {role} account</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center mt-4">
              By registering, you agree to our{' '}
              <button className="text-blue-600 hover:text-blue-500 font-medium">
                Terms of Service
              </button>{' '}
              and{' '}
              <button className="text-blue-600 hover:text-blue-500 font-medium">
                Privacy Policy
              </button>
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate("/login")}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in here
            </button>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            © {new Date().getFullYear()} College Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}