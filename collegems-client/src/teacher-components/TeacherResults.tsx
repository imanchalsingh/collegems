import { useEffect, useState } from "react";
import {
  User,
  BookOpen,
  Hash,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Filter,
  X,
  Calculator,
  Beaker,
  FileText,
  PenSquare,
  Send,
  AlertTriangle,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface Student {
  _id: string;
  name: string;
  studentId: string;
  email?: string;
  course?: string;
  semester?: number;
  department?: string;
}

interface Course {
  _id: string;
  name: string;
  code: string;
  credits?: number;
  department?: string;
  internalMax?: number;
  externalMax?: number;
  practicalMax?: number;
}

interface ResultForm {
  studentId: string;
  courseId: string;
  semester: string;
  internalMarks: number | '';
  externalMarks: number | '';
  practicalMarks: number | '';
  totalMarks: number | '';
  grade: string;
}

interface ApiError {
  message: string;
}

interface PublishPreviewData {
  course: { name: string; code: string };
  semester: string;
  totalStudents: number;
  students: Array<{
    _id: string;
    name: string;
    studentId: string;
    internalMarks: number;
    externalMarks: number;
    practicalMarks: number;
    totalMarks: number;
    grade: string;
  }>;
}

export default function TeacherResult() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [existingResults, setExistingResults] = useState<Set<string>>(new Set());

  const [publishCourseId, setPublishCourseId] = useState("");
  const [publishSemester, setPublishSemester] = useState("");
  const [publishPreviewData, setPublishPreviewData] = useState<PublishPreviewData | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishSuccess, setPublishSuccess] = useState("");

  const [form, setForm] = useState<ResultForm>({
    studentId: "",
    courseId: "",
    semester: "",
    internalMarks: '',
    externalMarks: '',
    practicalMarks: '',
    totalMarks: '',
    grade: "",
  });

  const grades = [
    { value: "A+", min: 90 },
    { value: "A", min: 80 },
    { value: "B+", min: 70 },
    { value: "B", min: 60 },
    { value: "C+", min: 50 },
    { value: "C", min: 40 },
    { value: "D", min: 33 },
    { value: "F", min: 0 },
  ];

  const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, selectedCourse, selectedSemester, selectedDepartment, students]);

  useEffect(() => {
    calculateTotalAndGrade();
  }, [form.internalMarks, form.externalMarks, form.practicalMarks]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/students?limit=0");
      setStudents(extractArray(response.data));
      setFilteredStudents(extractArray(response.data));
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses/all");
      setCourses(extractArray(res.data));
    } catch (error) {
      console.error("Error fetching courses:", error);
      setError("Failed to load courses");
    }
  };

  const checkExistingResult = async (studentId: string, courseId: string, semester: string) => {
    if (!studentId || !courseId || !semester) return;
    
    try {
      const res = await api.get(`/results/check`, {
        params: { studentId, courseId, semester }
      });
      
      if (res.data.exists) {
        setExistingResults(prev => new Set(prev).add(`${studentId}-${courseId}-${semester}`));
        setForm(res.data.result);
      } else {
        setExistingResults(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${studentId}-${courseId}-${semester}`);
          return newSet;
        });
        // Reset marks for new entry
        setForm(prev => ({
          ...prev,
          internalMarks: '',
          externalMarks: '',
          practicalMarks: '',
          totalMarks: '',
          grade: '',
        }));
      }
    } catch (error) {
      console.error("Error checking existing result:", error);
    }
  };

  useEffect(() => {
    if (form.studentId && form.courseId && form.semester) {
      checkExistingResult(form.studentId, form.courseId, form.semester);
    }
  }, [form.studentId, form.courseId, form.semester]);

  const calculateTotalAndGrade = () => {
    const internal = Number(form.internalMarks) || 0;
    const external = Number(form.externalMarks) || 0;
    const practical = Number(form.practicalMarks) || 0;
    
    const total = internal + external + practical;
    
    // Find grade based on total percentage
    const selectedCourseObj = courses.find(c => c._id === form.courseId);
    const maxMarks = (selectedCourseObj?.internalMax || 0) + 
                     (selectedCourseObj?.externalMax || 0) + 
                     (selectedCourseObj?.practicalMax || 0);
    
    if (maxMarks > 0) {
      const percentage = (total / maxMarks) * 100;
      const gradeObj = grades.find(g => percentage >= g.min) || grades[grades.length - 1];
      
      setForm(prev => ({
        ...prev,
        totalMarks: total,
        grade: gradeObj.value,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        totalMarks: total,
      }));
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter((student) => student.department === selectedDepartment);
    }

    if (selectedSemester) {
      filtered = filtered.filter(
        (student) => student.semester?.toString() === selectedSemester
      );
    }

    setFilteredStudents(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.studentId || !form.courseId || !form.semester) {
      setError("Please select student, course, and semester");
      return;
    }

    if (form.internalMarks === '' && form.externalMarks === '' && form.practicalMarks === '') {
      setError("Please enter at least one mark");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      
      const payload = {
        ...form,
        internalMarks: Number(form.internalMarks) || 0,
        externalMarks: Number(form.externalMarks) || 0,
        practicalMarks: Number(form.practicalMarks) || 0,
        totalMarks: Number(form.totalMarks) || 0,
      };
      
      await api.post("/results/create", payload);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Reset form but keep student/course/semester if needed
      setForm(prev => ({
        ...prev,
        internalMarks: '',
        externalMarks: '',
        practicalMarks: '',
        totalMarks: '',
        grade: '',
      }));
      
    } catch (err) {
      const error = err as { response?: { data?: ApiError } };
      setError(error.response?.data?.message || "Failed to save result");
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCourse("");
    setSelectedSemester("");
    setSelectedDepartment("");
  };

  const getUniqueDepartments = () => {
    const depts = students.map((s) => s.department).filter(Boolean);
    return [...new Set(depts)];
  };

  const selectedCourseObj = courses.find(c => c._id === form.courseId);

  const isExistingResult = form.studentId && form.courseId && form.semester 
    ? existingResults.has(`${form.studentId}-${form.courseId}-${form.semester}`)
    : false;

  const handlePublishPreview = async () => {
    if (!publishCourseId || !publishSemester) {
      setPublishError("Please select both course and semester");
      return;
    }
    try {
      setPublishError("");
      setPublishSuccess("");
      setPublishPreviewData(null);
      const res = await api.post("/results/publish-preview", {
        courseId: publishCourseId,
        semester: publishSemester,
      });
      setPublishPreviewData(res.data);
      setShowPublishModal(true);
    } catch (err: any) {
      setPublishError(err.response?.data?.message || "Failed to generate preview");
    }
  };

  const handlePublishAll = async () => {
    if (!publishPreviewData) return;
    try {
      setPublishingAll(true);
      setPublishError("");
      await api.post("/results/publish-all", {
        courseId: publishCourseId,
        semester: publishSemester,
      });
      setShowPublishModal(false);
      setPublishPreviewData(null);
      setPublishSuccess(`Successfully published ${publishPreviewData.totalStudents} result(s)`);
      setTimeout(() => setPublishSuccess(""), 5000);
    } catch (err: any) {
      setPublishError(err.response?.data?.message || "Bulk publish failed");
    } finally {
      setPublishingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Student Results</h1>
        <p className="text-gray-500 mt-1">Add or update academic results for students</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PenSquare className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isExistingResult ? 'Update Result' : 'Enter New Result'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    required
                  >
                    <option value="">Choose a student</option>
                    {filteredStudents.map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.studentId}) - Sem {student.semester}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Course
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.courseId}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    required
                  >
                    <option value="">Choose a course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Semester Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    required
                  >
                    <option value="">Select semester</option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Marks Entry Section */}
              {form.studentId && form.courseId && form.semester && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700">Enter Marks</h3>
                  
                  {/* Internal Marks */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Internal Marks {selectedCourseObj?.internalMax ? `(Max: ${selectedCourseObj.internalMax})` : ''}
                    </label>
                    <div className="relative">
                      <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        max={selectedCourseObj?.internalMax || 100}
                        value={form.internalMarks}
                        onChange={(e) => setForm({ 
                          ...form, 
                          internalMarks: e.target.value ? Number(e.target.value) : '' 
                        })}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter internal marks"
                      />
                    </div>
                  </div>

                  {/* External Marks */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      External Marks {selectedCourseObj?.externalMax ? `(Max: ${selectedCourseObj.externalMax})` : ''}
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        max={selectedCourseObj?.externalMax || 100}
                        value={form.externalMarks}
                        onChange={(e) => setForm({ 
                          ...form, 
                          externalMarks: e.target.value ? Number(e.target.value) : '' 
                        })}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter external marks"
                      />
                    </div>
                  </div>

                  {/* Practical Marks */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Practical Marks {selectedCourseObj?.practicalMax ? `(Max: ${selectedCourseObj.practicalMax})` : ''}
                    </label>
                    <div className="relative">
                      <Beaker className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        max={selectedCourseObj?.practicalMax || 100}
                        value={form.practicalMarks}
                        onChange={(e) => setForm({ 
                          ...form, 
                          practicalMarks: e.target.value ? Number(e.target.value) : '' 
                        })}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter practical marks"
                      />
                    </div>
                  </div>

                  {/* Calculated Total and Grade */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Total Marks</label>
                      <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-900">
                          {form.totalMarks || 0}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Calculated Grade</label>
                      <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className={`text-sm font-medium ${
                          form.grade === 'F' ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {form.grade || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>


                </div>
              )}

              {/* Status Messages */}
              {success && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Result saved successfully!</span>
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !form.studentId || !form.courseId || !form.semester}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isExistingResult ? 'Update Result' : 'Save Result'}
                  </>
                )}
              </button>
            </form>

            {/* Quick Info */}
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <GraduationCap className="w-4 h-4" />
                <span>{filteredStudents.length} students available</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BookOpen className="w-4 h-4" />
                <span>{courses.length} courses available</span>
              </div>
              {isExistingResult && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>Updating existing result</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Student Selection Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Filters */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  Filter Students
                </h3>
                {(searchTerm || selectedSemester || selectedDepartment) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear filters
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Department Filter */}
                <div>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Departments</option>
                    {getUniqueDepartments().map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Semester Filter */}
                <div>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Semesters</option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div className="overflow-y-auto max-h-150">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Loading students...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No students found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredStudents.map((student) => {
                    const hasResult = form.studentId === student._id;
                    return (
                      <div
                        key={student._id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          hasResult ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setForm({ ...form, studentId: student._id })}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                              <span className="text-sm font-medium text-blue-700">
                                {student.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{student.name}</h4>
                              <p className="text-sm text-gray-500 mt-0.5">{student.studentId}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {student.department && (
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                    {student.department}
                                  </span>
                                )}
                                {student.semester && (
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                    Sem {student.semester}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {hasResult && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{filteredStudents.length}</span> of{" "}
                <span className="font-medium">{students.length}</span> students
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Results Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Send className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Publish Results</h2>
        </div>

        {publishSuccess && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-4">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{publishSuccess}</span>
          </div>
        )}

        {publishError && (
          <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-2 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{publishError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={publishCourseId}
                onChange={(e) => setPublishCourseId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Choose a course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={publishSemester}
                onChange={(e) => setPublishSemester(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Select semester</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handlePublishPreview}
              disabled={!publishCourseId || !publishSemester}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Preview Publish
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Preview all draft results for the selected course and semester before publishing them.
          Published results become visible to students and lock their academic records.
        </p>
      </div>

      {/* Publish Preview Modal */}
      {showPublishModal && publishPreviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Publish Preview
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {publishPreviewData.course.name} ({publishPreviewData.course.code}) — Semester {publishPreviewData.semester}
              </p>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {publishPreviewData.totalStudents} student{publishPreviewData.totalStudents !== 1 ? "s" : ""} will be affected
                  </p>
                  <p className="text-xs text-amber-600">
                    Published results are immediately visible to students and cannot be reverted.
                  </p>
                </div>
              </div>

              {publishPreviewData.totalStudents > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <th className="pb-2 pr-4">Student</th>
                        <th className="pb-2 pr-4">ID</th>
                        <th className="pb-2 pr-4 text-right">Internal</th>
                        <th className="pb-2 pr-4 text-right">External</th>
                        <th className="pb-2 pr-4 text-right">Practical</th>
                        <th className="pb-2 pr-4 text-right">Total</th>
                        <th className="pb-2 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {publishPreviewData.students.map((s) => (
                        <tr key={s._id} className="text-sm hover:bg-gray-50">
                          <td className="py-2.5 pr-4 font-medium text-gray-900">{s.name}</td>
                          <td className="py-2.5 pr-4 text-gray-500">{s.studentId}</td>
                          <td className="py-2.5 pr-4 text-right text-gray-700">{s.internalMarks ?? "-"}</td>
                          <td className="py-2.5 pr-4 text-right text-gray-700">{s.externalMarks ?? "-"}</td>
                          <td className="py-2.5 pr-4 text-right text-gray-700">{s.practicalMarks ?? "-"}</td>
                          <td className="py-2.5 pr-4 text-right font-medium text-gray-900">{s.totalMarks ?? "-"}</td>
                          <td className="py-2.5 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              s.grade === "F" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {s.grade || "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No draft results to publish.</p>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setPublishPreviewData(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishAll}
                disabled={publishingAll || publishPreviewData.totalStudents === 0}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {publishingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirm Publish ({publishPreviewData.totalStudents})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}