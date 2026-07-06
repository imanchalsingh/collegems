import { useEffect, useState } from "react";
import { Save, AlertCircle, CheckCircle, Loader2, User, BookOpen } from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface Course {
  _id: string;
  name: string;
  code: string;
}

interface Student {
  _id: string;
  name: string;
  studentId: string;
}

interface AssessmentComponent {
  name: string;
  weightage: number;
  maxMarks: number;
}

export default function InternalMarksEntry() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  
  const [config, setConfig] = useState<AssessmentComponent[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchAssessmentConfig(selectedCourse);
    }
  }, [selectedCourse]);

  // Recalculate total whenever scores or config change
  useEffect(() => {
    let total = 0;
    config.forEach(comp => {
      const score = scores[comp.name] || 0;
      // Calculate: (score / maxMarks) * weightage
      const componentMark = (score / comp.maxMarks) * comp.weightage;
      total += componentMark;
    });
    setCalculatedTotal(parseFloat(total.toFixed(2)));
  }, [scores, config]);

  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses/all");
      setCourses(extractArray(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get("/users/students?limit=0");
      setStudents(extractArray(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssessmentConfig = async (courseId: string) => {
    try {
      setLoading(true);
      setError("");
      setConfig([]);
      setScores({});
      const res = await api.get(`/assessments/config/${courseId}`);
      if (res.data && res.data.components) {
        setConfig(res.data.components);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("No assessment configuration found for this course. Please set it up in Assessment Config first.");
      } else {
        setError("Error fetching assessment config.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (componentName: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    setScores(prev => ({ ...prev, [componentName]: numValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedStudent) {
      setError("Please select both a course and a student");
      return;
    }
    
    // Validate scores against maxMarks
    for (const comp of config) {
      const score = scores[comp.name] || 0;
      if (score > comp.maxMarks) {
        setError(`Score for ${comp.name} cannot exceed maximum marks (${comp.maxMarks})`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");
      
      const scoresArray = config.map(c => ({
        componentName: c.name,
        score: scores[c.name] || 0
      }));

      await api.post(`/assessments/marks/${selectedCourse}/${selectedStudent}`, { scores: scoresArray });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save marks");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Internal Marks Entry</h1>
        <p className="text-gray-500 mt-1">Enter marks for individual assessment components to automatically calculate the internal total.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading && <div className="text-blue-600 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin"/> Loading config...</div>}

          {config.length > 0 && selectedStudent && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Component Scores</h3>
              <div className="space-y-4">
                {config.map((comp, idx) => {
                  const currentScore = scores[comp.name] || 0;
                  const calculatedPart = ((currentScore / comp.maxMarks) * comp.weightage).toFixed(2);
                  return (
                    <div key={idx} className="flex flex-col md:flex-row items-center gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                      <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700">{comp.name}</label>
                        <p className="text-xs text-gray-500">Weightage: {comp.weightage}% | Max Marks: {comp.maxMarks}</p>
                      </div>
                      <div className="w-full md:w-48 relative">
                        <input
                          type="number"
                          min="0"
                          max={comp.maxMarks}
                          value={scores[comp.name] === undefined ? "" : scores[comp.name]}
                          onChange={(e) => handleScoreChange(comp.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Score"
                        />
                      </div>
                      <div className="w-full md:w-32 text-right">
                        <span className="text-sm font-medium text-blue-700">+{calculatedPart} marks</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="block text-sm text-blue-800">Calculated Internal Total</span>
                  <span className="block text-xs text-blue-600">Sum of (Score / Max) × Weightage</span>
                </div>
                <span className="text-2xl font-bold text-blue-900">{calculatedTotal} / 100</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span>Marks saved successfully!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || config.length === 0 || !selectedStudent}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Internal Marks
          </button>
        </form>
      </div>
    </div>
  );
}
