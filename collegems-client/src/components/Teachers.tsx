import React, { useEffect, useState } from "react";
import api from "../api/axios";

interface Teacher {
  name: string;
  email: string;
  role: string;
  teacherId: string;
}

const Teachers: React.FC = () => {
  const [teachers, setteachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredteachers, setFilteredteachers] = useState<Teacher[]>([]);
  const [selectedteacher, setSelectedteacher] = useState<Teacher | null>(null);

  useEffect(() => {
    fetchteachers();
  }, []);

  useEffect(() => {
    const filtered = teachers.filter(
      (teacher) =>
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.teacherId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredteachers(filtered);
  }, [searchTerm, teachers]);

  const fetchteachers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/teachers");
      console.log("Teachers response:", response.data); // Should log array
      setteachers(response.data);
      setFilteredteachers(response.data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      alert("Failed to load teachers data");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = () => {
    const colors = [
      "bg-linear-to-r from-[#bd2323] to-[#ff6b6b]",
      "bg-linear-to-r from-[#0a295e] to-[#4dabf7]",
      "bg-linear-to-r from-[#e6c235] to-[#f9d342]",
      "bg-linear-to-r from-[#059669] to-[#10b981]",
      "bg-linear-to-r from-[#7c3aed] to-[#8b5cf6]",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div
            className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-6 rounded-2xl flex justify-between"
            style={{ borderBottom: `3px solid #e6c235` }}
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">teacher Management</h1>

              <p className="text-gray-400">
                Manage and view all registered teachers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-linear-to-r from-[#0a295e] to-[#bd2323] text-sm font-medium">
                {teachers.length} teachers
              </span>
              <button
                onClick={fetchteachers}
                className="mt-4 md:mt-0 px-6 py-2 rounded-lg flex items-center font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #bd2323, #0a295e)",
                  border: "1px solid #e6c235",
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md mt-10">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search teachers by name, ID, or email..."
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#bd2323] rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="mt-4 text-gray-400">Loading teachers data...</p>
          </div>
        ) : (
          <>
            {/* teacher Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#bd2323]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total teachers</p>
                    <p className="text-3xl font-bold mt-2">{teachers.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#bd2323]/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#bd2323]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-[#0a295e]">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-full bg-[#0a295e]/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#0a295e]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* teachers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredteachers.length === 0 ? (
                <div className="col-span-full bg-gray-800 rounded-xl p-12 text-center">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1"
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="mt-4 text-xl text-gray-300">
                    No teachers found
                  </p>
                  <p className="text-gray-400 mt-2">
                    {searchTerm
                      ? "Try a different search term"
                      : "No teachers registered yet"}
                  </p>
                </div>
              ) : (
                filteredteachers.map((teacher) => (
                  <div
                    key={teacher.teacherId}
                    className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-[#bd2323] transition-all duration-300 hover:shadow-xl hover:shadow-[#bd2323]/10 group cursor-pointer"
                    onClick={() => setSelectedteacher(teacher)}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-14 h-14 rounded-xl ${getRandomColor()} flex items-center justify-center text-white font-bold text-xl`}
                      >
                        {getInitials(teacher.name)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white group-hover:text-[#e6c235] transition-colors">
                          {teacher.name}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          {teacher.email}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium">
                            ID: {teacher.teacherId}
                          </span>
                          <span className="px-2 py-1 bg-linear-to-r from-[#0a295e] to-[#bd2323] rounded text-xs font-medium">
                            teacher
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm">Joined</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Last Updated</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button className="text-sm text-[#e6c235] hover:text-[#bd2323] transition-colors flex items-center gap-1">
                        View Details
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* teacher Count */}
            <div className="mt-8 text-center text-gray-400">
              Showing {filteredteachers.length} of {teachers.length} teachers
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </>
        )}

        {/* teacher Detail Modal */}
        {selectedteacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedteacher(null)}
            />
            <div className="relative w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="p-6 bg-linear-to-r from-[#0a295e] to-[#bd2323]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    teacher Details
                  </h3>
                  <button
                    onClick={() => setSelectedteacher(null)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex flex-col items-center mb-6">
                  <div
                    className={`w-20 h-20 rounded-full ${getRandomColor()} flex items-center justify-center text-white font-bold text-2xl mb-4`}
                  >
                    {getInitials(selectedteacher.name)}
                  </div>
                  <h4 className="text-2xl font-bold text-white">
                    {selectedteacher.name}
                  </h4>
                  <p className="text-gray-400">{selectedteacher.email}</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <p className="text-gray-400 text-sm">teacher ID</p>
                    <p className="text-white font-medium">
                      {selectedteacher.teacherId}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-gray-400 text-sm">Role</p>
                      <p className="text-white font-medium capitalize">
                        {selectedteacher.role}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-gray-400 text-sm">Status</p>
                      <p className="text-green-400 font-medium">Active</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-gray-400 text-sm">Joined On</p>
                    </div>
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-gray-400 text-sm">Last Updated</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedteacher(null)}
                    className="px-5 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                  <button className="px-5 py-2 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white rounded-lg hover:shadow-lg transition-all">
                    View Full Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teachers;
