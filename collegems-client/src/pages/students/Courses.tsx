import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  Filter,
  ChevronDown,
  X,
  Bookmark,
  Users,
  Calendar,
  Clock,
  Award,
  Building2,
  UserCircle,
  Eye,
  PlusCircle,
  Grid3x3,
  List,
  Download,
} from "lucide-react";
import api from "../../api/axios";

interface Course {
  id: string;
  name: string;
  code: string;
  department?: string;
  semester?: number;
  credits?: number;
  instructor?: string;
  duration?: string;
  enrolled?: number;
  capacity?: number;
  status?: 'active' | 'inactive';
}

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
  const filteredCourses = courses.filter((course: Course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.instructor?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (filter === "all") return matchesSearch;
    if (filter === "active") return matchesSearch && course.status === 'active';
    if (filter === "inactive") return matchesSearch && course.status === 'inactive';
    
    return matchesSearch && course.department === filter;
  });

  // Get unique departments for filter
  const departments = Array.from(
    new Set(courses.map((course: Course) => course.department).filter(Boolean)),
  );

  const stats = {
    total: courses.length,
    departments: departments.length,
    active: courses.filter(c => c.status === 'active').length,
    totalCredits: courses.reduce((acc, course) => acc + (course.credits || 0), 0),
  };

  return (
    <div className="space-y-6 p-10">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Catalog</h1>
            <p className="text-gray-500 mt-1">Browse and manage all available courses</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <PlusCircle className="w-4 h-4" />
              Add Course
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Courses</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Departments</p>
              <p className="text-xl font-bold text-gray-900">{stats.departments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Courses</p>
              <p className="text-xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Credits</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalCredits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search courses by name, code, or instructor..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'border-gray-300 text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'border-gray-300 text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Clear Button */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  <option value="active">Active Courses</option>
                  <option value="inactive">Inactive Courses</option>
                  <optgroup label="By Department">
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credits
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Credits</option>
                  <option value="1-2">1-2 Credits</option>
                  <option value="3-4">3-4 Credits</option>
                  <option value="5+">5+ Credits</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">{filteredCourses.length}</span> of{" "}
          <span className="font-medium text-gray-900">{courses.length}</span> courses
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading courses...</p>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? `No courses match "${searchTerm}"`
                : "No courses are available at the moment"}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course: Course) => (
            <div
              key={course.id}
              className="group bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all overflow-hidden"
            >
              {/* Course Header */}
              <div className="relative p-5 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-lg">
                      {course.code.substring(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {course.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">{course.code}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    course.status === 'active' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      course.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    {course.status || 'active'}
                  </span>
                </div>
              </div>

              {/* Course Details */}
              <div className="p-5">
                <div className="space-y-3">
                  {course.department && (
                    <div className="flex items-center text-sm">
                      <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{course.department}</span>
                    </div>
                  )}

                  {course.instructor && (
                    <div className="flex items-center text-sm">
                      <UserCircle className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{course.instructor}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    {course.semester && (
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-gray-600">Sem {course.semester}</span>
                      </div>
                    )}
                    {course.credits && (
                      <div className="flex items-center text-sm">
                        <Award className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-gray-600">{course.credits} Credits</span>
                      </div>
                    )}
                  </div>

                  {(course.enrolled !== undefined || course.capacity) && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-gray-600">
                          {course.enrolled || 0}/{course.capacity || 30} enrolled
                        </span>
                      </div>
                      {course.enrolled !== undefined && course.capacity && (
                        <span className="text-xs text-gray-500">
                          {Math.round((course.enrolled / course.capacity) * 100)}% full
                        </span>
                      )}
                    </div>
                  )}

                  {course.duration && (
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-gray-600">{course.duration}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <button className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    <Eye className="w-4 h-4 mr-1" />
                    Details
                  </button>
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                    <PlusCircle className="w-4 h-4" />
                    Enroll
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{course.name}</div>
                        <div className="text-sm text-gray-500">{course.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.department || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.instructor || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.semester || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.credits || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        course.status === 'active' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          course.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></span>
                        {course.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;