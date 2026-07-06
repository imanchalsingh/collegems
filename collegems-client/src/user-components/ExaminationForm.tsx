import React, { useEffect, useState } from "react";
import {
  FileText, CheckCircle, AlertCircle, Clock, BookOpen, User,
  Hash, GraduationCap, Calendar, ListChecks, HelpCircle,
  RefreshCw, Check, ArrowRight
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { scrollToFirstError } from "../utils/formHelpers";
import useFormTracker from "../hooks/useFormTracker";

interface Course {
  _id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
}

interface SubmittedForm {
  _id: string;
  studentName: string;
  rollNumber: string;
  courseDept: string;
  semesterYear: string;
  subjects: string[];
  examType: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

const ExaminationForm: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<SubmittedForm[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { trackField, markSubmitted } = useFormTracker({ formId: "examination_form" });

  // Form Fields
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [courseDept, setCourseDept] = useState("");
  const [semesterYear, setSemesterYear] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [examType, setExamType] = useState("");

  // Validation & Status
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    // Prefill from localStorage User Data
    try {
      const stored = localStorage.getItem("userData");
      if (stored) {
        const userData = JSON.parse(stored);
        setStudentName(userData.name || "");
        setRollNumber(userData.studentId || "");
        setCourseDept(userData.course || "");
        setSemesterYear(userData.semester ? `Semester ${userData.semester}` : "");
      }
    } catch (e) {
      console.error("Error parsing userData from localStorage:", e);
    }

    fetchCourses();
    fetchSubmissions();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await api.get("/courses/all");
      setCourses(extractArray(res.data));
    } catch (err) {
      console.error("Error fetching courses for subjects:", err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await api.get("/exam-forms");
      setSubmissions(extractArray(res.data));
    } catch (err) {
      console.error("Error fetching past submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSubjectToggle = (subjectCode: string) => {
    if (selectedSubjects.includes(subjectCode)) {
      setSelectedSubjects(selectedSubjects.filter((code) => code !== subjectCode));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectCode]);
    }
    if (errors.subjects) {
      setErrors((prev) => ({ ...prev, subjects: "" }));
    }
    trackField("subjects", 6);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!studentName.trim()) {
      newErrors.studentName = "Student name is required";
    } else if (studentName.trim().length < 3) {
      newErrors.studentName = "Name must be at least 3 characters";
    }

    if (!rollNumber.trim()) {
      newErrors.rollNumber = "Roll number / Student ID is required";
    }

    if (!courseDept.trim()) {
      newErrors.courseDept = "Course / Department is required";
    }

    if (!semesterYear.trim()) {
      newErrors.semesterYear = "Semester / Year is required";
    }

    if (selectedSubjects.length === 0) {
      newErrors.subjects = "At least one subject must be selected";
    }

    if (!examType) {
      newErrors.examType = "Please select an Exam Type";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        studentName: studentName.trim(),
        rollNumber: rollNumber.trim(),
        courseDept: courseDept.trim(),
        semesterYear: semesterYear.trim(),
        subjects: selectedSubjects,
        examType,
      };

      await api.post("/exam-forms", payload);
      setSubmitSuccess(true);
      markSubmitted();
      setSelectedSubjects([]);
      setExamType("");
      
      // Refresh submissions list
      fetchSubmissions();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 7000);

    } catch (err: any) {
      console.error("Error submitting exam form:", err);
      const errMsg = err.response?.data?.message || "Something went wrong while submitting the form. Please try again.";
      setSubmitError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";
    }
  };

  return (
    <div className="space-y-8 p-1 sm:p-4">
      {/* Introduction Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Examination Registration
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl">
              Fill out and submit your online examination form. Make sure your subjects are correctly selected. Once submitted, your registration will be reviewed by the Head of Department (HOD).
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
            <Clock className="w-3.5 h-3.5" />
            Registration Open
          </div>
        </div>
      </div>

      {/* Main Grid: Form on left, History on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-blue-500" />
              Fill Examination Form
            </h2>

            {submitSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3 animate-fade-in-down">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Form Submitted Successfully!</p>
                  <p className="text-xs text-emerald-700 mt-1">Your examination form has been recorded. You can track its status in the "Submissions History" panel.</p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Submission Failed</p>
                  <p className="text-xs text-rose-700 mt-1">{submitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Row 1: Student Name & Roll Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    Student Name
                  </label>
                  <input
                    type="text"
                    name="studentName"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      if (errors.studentName) setErrors((prev) => ({ ...prev, studentName: "" }));
                    }}
                    onBlur={() => trackField("studentName", 6)}
                    placeholder="Enter full name"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                      errors.studentName ? "border-red-400 focus:ring-red-400" : "border-gray-300"
                    }`}
                  />
                  {errors.studentName && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.studentName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-gray-400" />
                    Roll Number / Student ID
                  </label>
                  <input
                    type="text"
                    name="rollNumber"
                    value={rollNumber}
                    onChange={(e) => {
                      setRollNumber(e.target.value);
                      if (errors.rollNumber) setErrors((prev) => ({ ...prev, rollNumber: "" }));
                    }}
                    onBlur={() => trackField("rollNumber", 6)}
                    placeholder="Enter student ID"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                      errors.rollNumber ? "border-red-400 focus:ring-red-400" : "border-gray-300"
                    }`}
                  />
                  {errors.rollNumber && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.rollNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Course/Dept & Semester/Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    Course / Department
                  </label>
                  <input
                    type="text"
                    name="courseDept"
                    value={courseDept}
                    onChange={(e) => {
                      setCourseDept(e.target.value);
                      if (errors.courseDept) setErrors((prev) => ({ ...prev, courseDept: "" }));
                    }}
                    onBlur={() => trackField("courseDept", 6)}
                    placeholder="e.g. Computer Science & Engineering"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                      errors.courseDept ? "border-red-400 focus:ring-red-400" : "border-gray-300"
                    }`}
                  />
                  {errors.courseDept && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.courseDept}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Semester / Year
                  </label>
                  <input
                    type="text"
                    name="semesterYear"
                    value={semesterYear}
                    onChange={(e) => {
                      setSemesterYear(e.target.value);
                      if (errors.semesterYear) setErrors((prev) => ({ ...prev, semesterYear: "" }));
                    }}
                    onBlur={() => trackField("semesterYear", 6)}
                    placeholder="e.g. Semester 6 or Year 3"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                      errors.semesterYear ? "border-red-400 focus:ring-red-400" : "border-gray-300"
                    }`}
                  />
                  {errors.semesterYear && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.semesterYear}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Exam Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                  Exam Type
                </label>
                <div id="examType" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["Regular", "Backlog", "Improvement", "Re-evaluation"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setExamType(type);
                        if (errors.examType) setErrors((prev) => ({ ...prev, examType: "" }));
                        trackField("examType", 6);
                      }}
                      className={`px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                        examType === type
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {errors.examType && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.examType}
                  </p>
                )}
              </div>

              {/* Row 4: Subject Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  Select Subjects / Courses
                  <span className="text-xs text-gray-400 font-normal">(Dynamic Catalog)</span>
                </label>

                {loadingCourses ? (
                  <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                    <p className="text-xs text-gray-500 mt-2">Loading courses list...</p>
                  </div>
                ) : courses.length === 0 ? (
                  <div className="py-6 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500">
                    No active courses found to select subjects.
                  </div>
                ) : (
                  <div id="subjects" className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {courses.map((course) => {
                      const isSelected = selectedSubjects.includes(course.name);
                      return (
                        <div
                          key={course._id}
                          onClick={() => handleSubjectToggle(course.name)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
                              : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">{course.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">{course.code} • Sem {course.semester}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {errors.subjects && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.subjects}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/10"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting Form...
                    </>
                  ) : (
                    <>
                      Submit Examination Form
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* History Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                Submissions History
              </h2>
              <button
                onClick={fetchSubmissions}
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Refresh history"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingSubmissions ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                <p className="text-xs text-gray-500 mt-2">Loading past submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">No submissions yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">
                  Your submitted exam forms will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {submissions.map((form) => (
                  <div
                    key={form._id}
                    className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {form.examType}
                        </span>
                        <p className="text-xs font-bold text-gray-900 dark:text-white mt-1.5">{form.semesterYear}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(form.status)}`}>
                        {form.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">Subjects:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {form.subjects.map((sub, i) => (
                          <li key={i}>{sub}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                      <span>Ref: #{form._id.slice(-8).toUpperCase()}</span>
                      <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExaminationForm;
