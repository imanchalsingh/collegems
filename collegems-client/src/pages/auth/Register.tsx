import { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

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

    // Basic validation
    if (!form.name || !form.email || !form.password) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", { ...form, role });
      alert("Registered successfully");
      const routes = {
        student: "/student/dashboard",
        teacher: "/teacher/dashboard",
        hod: "/hod/dashboard",
      };
      navigate(routes[role] || "/");
      // Reset form after successful registration
      setForm({});
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          {/* Header with accent color */}
          <div
            className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-6"
            style={{
              borderBottom: `3px solid #e6c235`,
            }}
          >
            <h1 className="text-2xl font-bold text-white text-center">
              College Management System
            </h1>
            <p className="text-gray-200 text-center mt-1">Create New Account</p>
          </div>

          <div className="p-6 space-y-4">
            {/* User Role Selection */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Register as:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "student", label: "Student", color: "#bd2323" },
                  { value: "teacher", label: "Teacher", color: "#0a295e" },
                  { value: "hod", label: "HOD", color: "#e6c235" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRole(option.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      role === option.value
                        ? "text-white transform scale-[1.02] shadow-lg"
                        : "text-gray-400 bg-gray-700 hover:bg-gray-600"
                    }`}
                    style={{
                      backgroundColor:
                        role === option.value ? option.color : undefined,
                      border:
                        role === option.value ? "none" : "1px solid #374151",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Common Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Full Name *
                </label>
                <input
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                  name="name"
                  placeholder="Enter your full name"
                  value={form.name || ""}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Email Address *
                </label>
                <input
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email || ""}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Password *
                </label>
                <input
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={form.password || ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Role-specific Fields */}
            <div className="space-y-3">
              {role === "student" && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Semester *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                    name="semester"
                    placeholder="Enter your Semester"
                    value={form.semester || ""}
                    onChange={handleChange}
                  />
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Course *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                    name="course"
                    placeholder="e.g.: BCA/MBA"
                    value={form.course || ""}
                    onChange={handleChange}
                  />
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Student ID *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-1 focus:ring-[#bd2323] transition-colors"
                    name="studentId"
                    placeholder="Enter your student ID"
                    value={form.studentId || ""}
                    onChange={handleChange}
                  />
                </div>
              )}

              {role === "teacher" && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Teacher ID *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0a295e] focus:ring-1 focus:ring-[#0a295e] transition-colors"
                    name="teacherId"
                    placeholder="Enter your teacher ID"
                    value={form.teacherId || ""}
                    onChange={handleChange}
                  />
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Department *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0a295e] focus:ring-1 focus:ring-[#0a295e] transition-colors"
                    name="department"
                    placeholder="e.g.: BCA/BBA"
                    value={form.department || ""}
                    onChange={handleChange}
                  />
                </div>
              )}

              {role === "hod" && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Department Code *
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#e6c235] focus:ring-1 focus:ring-[#e6c235] transition-colors"
                    name="departmentCode"
                    placeholder="Enter department code"
                    value={form.departmentCode || ""}
                    onChange={handleChange}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-3 px-4 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{
                boxShadow: "0 4px 15px rgba(189, 35, 35, 0.3)",
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-3 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                `Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`
              )}
            </button>

            {/* Role Indicator */}
            <div className="text-center">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor:
                    role === "student"
                      ? "rgba(189, 35, 35, 0.2)"
                      : role === "teacher"
                        ? "rgba(10, 41, 94, 0.2)"
                        : role === "hod"
                          ? "rgba(230, 194, 53, 0.2)"
                          : "rgba(0, 0, 0, 0.2)",
                  color:
                    role === "student"
                      ? "#ff6b6b"
                      : role === "teacher"
                        ? "#4dabf7"
                        : role === "hod"
                          ? "#e6c235"
                          : "#ffffff",
                  border: `1px solid ${
                    role === "student"
                      ? "#bd2323"
                      : role === "teacher"
                        ? "#0a295e"
                        : role === "hod"
                          ? "#e6c235"
                          : "#000000"
                  }`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{
                    backgroundColor:
                      role === "student"
                        ? "#bd2323"
                        : role === "teacher"
                          ? "#0a295e"
                          : role === "hod"
                            ? "#e6c235"
                            : "#000000",
                  }}
                ></span>
                {role.toUpperCase()} Registration
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-850 border-t border-gray-700">
            <p className="text-center text-gray-400 text-sm">
              Already have an account?{" "}
              <span
                className="font-medium hover:text-[#e6c235] transition-colors"
                style={{ color: "#e6c235" }}
                onClick={() => {
                  navigate("/login");
                }}
              >
                Sign in here
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
