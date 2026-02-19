import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  RefreshCw,
  X,
  Mail,
  IdCard,
  Calendar,
  UserCircle,
  GraduationCap,
  BookOpen,
  ChevronRight,
  Filter,
} from "lucide-react";
import api from "../api/axios";

interface Teacher {
  name: string;
  email: string;
  role: string;
  teacherId: string;
  department?: string;
  joinDate?: string;
  phone?: string;
  qualification?: string;
}

const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    const filtered = teachers.filter(
      (teacher) =>
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.teacherId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredTeachers(filtered);
  }, [searchTerm, teachers]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/teachers");
      setTeachers(response.data);
      setFilteredTeachers(response.data);
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

  const getColorClass = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-amber-100 text-amber-700",
      "bg-emerald-100 text-emerald-700",
      "bg-purple-100 text-purple-700",
      "bg-rose-100 text-rose-700",
    ];
    return colors[index % colors.length];
  };

  const departments = [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "English",
  ];

  const stats = {
    total: teachers.length,
    active: teachers.length,
    departments: new Set(teachers.map((t) => t.department)).size,
  };

  return (
    <div className="space-y-6 p-10 ">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Teachers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <UserCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Teachers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Departments</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.departments}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search teachers by name, ID, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={fetchTeachers}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Teachers Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading teachers...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No teachers found
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? "Try adjusting your search or filters"
              : "No teachers registered yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher, index) => (
            <div
              key={teacher.teacherId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedTeacher(teacher)}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl ${getColorClass(index)} flex items-center justify-center font-bold text-xl`}
                  >
                    {getInitials(teacher.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {teacher.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {teacher.email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <IdCard className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      ID: {teacher.teacherId}
                    </span>
                  </div>
                  {teacher.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {teacher.department}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                    {teacher.role}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                    Active
                  </span>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    Joined 2024
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1">
                    View Profile
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!loading && filteredTeachers.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredTeachers.length} of {teachers.length} teachers
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}

      {/* Teacher Detail Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setSelectedTeacher(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Teacher Profile
                </h3>
                <button
                  onClick={() => setSelectedTeacher(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl mb-4">
                  {getInitials(selectedTeacher.name)}
                </div>
                <h4 className="text-xl font-bold text-gray-900">
                  {selectedTeacher.name}
                </h4>
                <p className="text-gray-500 flex items-center gap-1 mt-1">
                  <Mail className="w-4 h-4" />
                  {selectedTeacher.email}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Teacher ID</p>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-gray-400" />
                      {selectedTeacher.teacherId}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Role</p>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      {selectedTeacher.role}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedTeacher.qualification && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">
                        Qualification
                      </p>
                      <p className="font-medium text-gray-900">
                        {selectedTeacher.qualification}
                      </p>
                    </div>
                  )}
                  {selectedTeacher.phone && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Phone</p>
                      <p className="font-medium text-gray-900">
                        {selectedTeacher.phone}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="font-medium text-gray-900">Active</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Joined Date</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {selectedTeacher.joinDate || "January 2024"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedTeacher(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  View Full Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
