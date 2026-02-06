import React, { useEffect, useState } from "react";
import api from "../../api/axios";

const Courses: React.FC = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await api.get("/courses/all");
        setCourses(response.data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Filter and search courses
  const filteredCourses = courses.filter((course: any) => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "all") return matchesSearch;
    if (filter === "department") return matchesSearch && course.department;
    if (filter === "semester") return matchesSearch && course.semester;
    
    return matchesSearch && course.department === filter;
  });

  // Get unique departments for filter
  const departments = Array.from(
    new Set(courses.map((course: any) => course.department).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">All Courses</h1>
              <p className="text-gray-400 mt-2">Browse and explore available courses</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Total Courses:</span>
              <span className="px-3 py-1 bg-linear-to-r from-[#0a295e] to-[#bd2323] text-white text-sm font-medium rounded-full">
                {courses.length}
              </span>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mt-6 flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search courses by name or code..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] focus:ring-2 focus:ring-[#bd2323]/30 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Dropdown */}
            <div className="flex gap-2">
              <select
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0a295e] min-w-37.5 transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Courses</option>
                <option value="department">By Department</option>
                <option value="semester">By Semester</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <button 
                onClick={() => setSearchTerm("")}
                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-[#e6c235] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#bd2323] rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="mt-4 text-gray-400">Loading courses...</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-300">
                Showing <span className="text-white font-semibold">{filteredCourses.length}</span> of{" "}
                <span className="text-white font-semibold">{courses.length}</span> courses
              </p>
            </div>

            {/* Empty State */}
            {filteredCourses.length === 0 ? (
              <div className="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-700/50">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-linear-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-gray-700">
                  <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No courses found</h3>
                <p className="text-gray-400 mb-6">
                  {searchTerm 
                    ? `No courses match "${searchTerm}"`
                    : "No courses are available at the moment"}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-2 bg-linear-to-r from-[#0a295e] to-[#bd2323] text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              /* Courses Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course: any) => (
                  <div
                    key={course.id}
                    className="group bg-gray-800 rounded-xl border border-gray-700 hover:border-[#bd2323]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#bd2323]/10 overflow-hidden"
                  >
                    {/* Course Header */}
                    <div 
                      className="relative p-6"
                      style={{
                        background: "linear-gradient(135deg, rgba(10, 41, 94, 0.2) 0%, rgba(189, 35, 35, 0.1) 100%)"
                      }}
                    >
                      <div className="absolute top-4 right-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-700/50 text-gray-300">
                          ID: {course.id}
                        </span>
                      </div>
                      
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-lg bg-linear-to-br from-[#0a295e] to-[#bd2323] flex items-center justify-center mr-4 shrink-0">
                          <span className="text-white font-bold text-lg">
                            {course.code.substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#e6c235] transition-colors">
                            {course.name}
                          </h3>
                          <p className="text-sm text-gray-300 font-mono">{course.code}</p>
                        </div>
                      </div>
                    </div>

                    {/* Course Details */}
                    <div className="p-6">
                      <div className="space-y-3">
                        {/* Department */}
                        {course.department && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-sm text-gray-300">
                              Department: <span className="text-white font-medium ml-1">{course.department}</span>
                            </span>
                          </div>
                        )}

                        {/* Semester */}
                        {course.semester && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-gray-300">
                              Semester: <span className="text-white font-medium ml-1">{course.semester}</span>
                            </span>
                          </div>
                        )}

                        {/* Credits (if available) */}
                        {course.credits && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-gray-300">
                              Credits: <span className="text-white font-medium ml-1">{course.credits}</span>
                            </span>
                          </div>
                        )}

                        {/* Instructor (if available) */}
                        {course.instructor && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm text-gray-300">
                              Instructor: <span className="text-white font-medium ml-1">{course.instructor}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-6 pt-6 border-t border-gray-700 flex justify-between">
                        <button className="text-sm text-gray-400 hover:text-white transition-colors flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                        
                        <button 
                          className="text-sm px-3 py-1 rounded-lg bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white hover:opacity-90 transition-opacity flex items-center"
                          style={{
                            boxShadow: "0 2px 10px rgba(189, 35, 35, 0.2)"
                          }}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Enroll
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Footer */}
            <div className="mt-8 p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-gray-800/30">
                  <div className="text-2xl font-bold text-white mb-1">{courses.length}</div>
                  <div className="text-sm text-gray-400">Total Courses</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-800/30">
                  <div className="text-2xl font-bold text-white mb-1">
                    {departments.length}
                  </div>
                  <div className="text-sm text-gray-400">Departments</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-800/30">
                  <div className="text-2xl font-bold text-white mb-1">
                    {Array.from(new Set(courses.map((c: any) => c.semester).filter(Boolean))).length}
                  </div>
                  <div className="text-sm text-gray-400">Semesters</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Courses;