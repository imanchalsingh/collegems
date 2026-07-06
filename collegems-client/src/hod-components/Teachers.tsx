import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, RefreshCw, X, Mail, IdCard, Calendar,
  UserCircle, GraduationCap, BookOpen, ChevronRight, Filter, Clock, MapPin, Wifi,Plus,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { SavedFiltersMenu } from "../common-components-management/SavedFiltersMenu";
import EmptyState from "../components/EmptyState";

interface Teacher {
  _id?: string;
  name: string;
  email: string;
  role: string;
  teacherId: string;
  department?: string;
  joinDate?: string;
  phone?: string;
  qualification?: string;
}

interface OfficeHourSlot {
  day: string;
  startTime: string;
  endTime: string;
  location?: string;
  isOnline?: boolean;
}

const Teachers: React.FC = () => {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [error, setError] = useState("");
  const [officeHours, setOfficeHours] = useState<{ slots: OfficeHourSlot[]; notes: string } | null>(null);
  const [officeHoursLoading, setOfficeHoursLoading] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);

const [teacherForm, setTeacherForm] = useState({
  name: "",
  email: "",
  password: "",
  teacherId: "",
  department: "",
  phone: "",
});

const [creatingTeacher, setCreatingTeacher] = useState(false);

  useEffect(() => { fetchTeachers(); }, []);

  useEffect(() => {
    let filtered = teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.teacherId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    
    if (filterDepartment !== "all") {
      filtered = filtered.filter((t) => t.department === filterDepartment);
    }
    
    setFilteredTeachers(filtered);
  }, [searchTerm, teachers, filterDepartment]);

  useEffect(() => {
    if (!selectedTeacher?._id) {
      setOfficeHours(null);
      return;
    }
    const fetchOfficeHours = async () => {
      setOfficeHoursLoading(true);
      try {
        const res = await api.get(`/office-hours/faculty/${selectedTeacher._id}`);
        setOfficeHours(res.data.officeHours);
      } catch {
        setOfficeHours(null);
      } finally {
        setOfficeHoursLoading(false);
      }
    };
    fetchOfficeHours();
  }, [selectedTeacher]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/users/teachers");
      setTeachers(extractArray(response.data));
      setFilteredTeachers(extractArray(response.data));
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setError("Failed to load teachers data");
    } finally {
      setLoading(false);
    }
  };
const createTeacher = async () => {
  try {
    setCreatingTeacher(true);

    await api.post("/users/teachers", teacherForm);

    alert("Teacher created successfully!");

    setShowAddTeacher(false);

    setTeacherForm({
      name: "",
      email: "",
      password: "",
      teacherId: "",
      department: "",
      phone: "",
    });

    fetchTeachers();
  } catch (err: any) {
    alert(err.response?.data?.message || "Failed to create teacher");
  } finally {
    setCreatingTeacher(false);
  }
};
  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const getColorClass = (index: number) => {
    const colors = [
      "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
      "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    ];
    return colors[index % colors.length];
  };

  const departments = ["Computer Science", "Mathematics", "Physics", "Chemistry", "English"];

  const stats = {
    total: teachers.length,
    active: teachers.length,
    departments: new Set(teachers.map((t) => t.department)).size,
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const selectCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const handleApplySavedFilter = (savedFilters: any) => {
    if (savedFilters.searchTerm !== undefined) setSearchTerm(savedFilters.searchTerm);
    if (savedFilters.filterDepartment !== undefined) setFilterDepartment(savedFilters.filterDepartment);
  };

  return (
    <div className="space-y-6 p-10 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Teachers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <UserCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Teachers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Departments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.departments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search teachers by name, ID, or email..."
              className={`${inputCls} pl-10`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            <SavedFiltersMenu 
              dashboardName="HODTeachers" 
              currentFilters={{ searchTerm, filterDepartment }} 
              onApplyFilter={handleApplySavedFilter} 
            />
            <button
  onClick={() => setShowAddTeacher(true)}
  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
>
  <Plus className="w-4 h-4" />
  Add Teacher
</button>
            <button
              onClick={fetchTeachers}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className={selectCls}
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Teachers Grid */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading teachers...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        searchTerm || filterDepartment !== "all" ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No teachers found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="w-7 h-7 text-blue-600" />}
            title="No teachers registered yet"
            description="Add the first teacher to start building your faculty roster."
            actionLabel="Register Teacher"
            onAction={() => navigate("/register")}
            actionHint="Opens the registration page for a new teacher account."
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher, index) => (
            <div
              key={teacher.teacherId}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedTeacher(teacher)}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl ${getColorClass(index)} flex items-center justify-center font-bold text-xl`}>
                    {getInitials(teacher.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{teacher.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{teacher.email}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <IdCard className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">ID: {teacher.teacherId}</span>
                  </div>
                  {teacher.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">{teacher.department}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {teacher.role}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                    Active
                  </span>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    Joined {teacher.joinDate?.split("-")[0] || "2024"}
                  </div>
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium inline-flex items-center gap-1">
                    View Profile <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredTeachers.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {filteredTeachers.length} of {teachers.length} teachers
          {(searchTerm || filterDepartment !== "all") && ` matching criteria`}
        </div>
      )}
      {showAddTeacher && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Add New Teacher
        </h2>

        <button onClick={() => setShowAddTeacher(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">

        <input
          className={inputCls}
          placeholder="Full Name"
          value={teacherForm.name}
          onChange={(e) =>
            setTeacherForm({ ...teacherForm, name: e.target.value })
          }
        />

        <input
          className={inputCls}
          placeholder="Email"
          value={teacherForm.email}
          onChange={(e) =>
            setTeacherForm({ ...teacherForm, email: e.target.value })
          }
        />

        <input
          className={inputCls}
          type="password"
          placeholder="Password"
          value={teacherForm.password}
          onChange={(e) =>
            setTeacherForm({ ...teacherForm, password: e.target.value })
          }
        />

        <input
          className={inputCls}
          placeholder="Teacher ID"
          value={teacherForm.teacherId}
          onChange={(e) =>
            setTeacherForm({
              ...teacherForm,
              teacherId: e.target.value,
            })
          }
        />

        <input
          className={inputCls}
          placeholder="Department"
          value={teacherForm.department}
          onChange={(e) =>
            setTeacherForm({
              ...teacherForm,
              department: e.target.value,
            })
          }
        />

        <input
          className={inputCls}
          placeholder="Phone"
          value={teacherForm.phone}
          onChange={(e) =>
            setTeacherForm({
              ...teacherForm,
              phone: e.target.value,
            })
          }
        />

      </div>

      <div className="flex justify-end gap-3 mt-6">

        <button
          onClick={() => setShowAddTeacher(false)}
          className="px-4 py-2 rounded-lg border"
        >
          Cancel
        </button>

        <button
          onClick={createTeacher}
          disabled={creatingTeacher}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creatingTeacher ? "Creating..." : "Create Teacher"}
        </button>

      </div>
    </div>
  </div>
)}
      {/* Teacher Detail Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedTeacher(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="bg-blue-600 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Teacher Profile</h3>
                <button onClick={() => setSelectedTeacher(null)} className="text-white/80 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xl mb-3">
                  {getInitials(selectedTeacher.name)}
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTeacher.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                  <Mail className="w-4 h-4" />{selectedTeacher.email}
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Teacher ID</p>
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                      <IdCard className="w-4 h-4 text-gray-400 dark:text-gray-500" />{selectedTeacher.teacherId}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Role</p>
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                      <GraduationCap className="w-4 h-4 text-gray-400 dark:text-gray-500" />{selectedTeacher.role}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {selectedTeacher.qualification && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Qualification</p>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{selectedTeacher.qualification}</p>
                    </div>
                  )}
                  {selectedTeacher.phone && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{selectedTeacher.phone}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="font-medium text-gray-900 dark:text-white">Active</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Joined</p>
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {selectedTeacher.joinDate || "Jan 2024"}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    Office Hours
                  </p>
                  {officeHoursLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                      Loading...
                    </div>
                  ) : officeHours && officeHours.slots.length > 0 ? (
                    <div className="space-y-1.5">
                      {officeHours.slots.map((slot, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-900 dark:text-white min-w-[80px]">{slot.day}</span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            {slot.isOnline ? (
                              <><Wifi className="w-3 h-3" /> Online</>
                            ) : slot.location ? (
                              <><MapPin className="w-3 h-3" /> {slot.location}</>
                            ) : null}
                          </span>
                        </div>
                      ))}
                      {officeHours.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{officeHours.notes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Not set</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedTeacher(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  Close
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