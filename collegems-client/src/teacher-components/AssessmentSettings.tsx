import { useEffect, useState } from "react";
import { Save, Plus, Trash2, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface Course {
  _id: string;
  name: string;
  code: string;
}

interface AssessmentComponent {
  name: string;
  weightage: number;
  maxMarks: number;
}

export default function AssessmentSettings() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [components, setComponents] = useState<AssessmentComponent[]>([]);
  const [, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchAssessmentConfig(selectedCourse);
    } else {
      setComponents([]);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/courses/all");
      setCourses(extractArray(res.data));
    } catch (err) {
      console.error("Error fetching courses", err);
      setError("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessmentConfig = async (courseId: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/assessments/config/${courseId}`);
      if (res.data && res.data.components) {
        setComponents(res.data.components);
      } else {
        setComponents([]);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No config found, initialize with defaults
        setComponents([
          { name: "Assignments", weightage: 30, maxMarks: 100 },
          { name: "Quizzes", weightage: 20, maxMarks: 50 },
          { name: "Midterm", weightage: 50, maxMarks: 100 },
        ]);
      } else {
        setError("Failed to load assessment configuration");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddComponent = () => {
    setComponents([...components, { name: "", weightage: 0, maxMarks: 100 }]);
  };

  const handleRemoveComponent = (index: number) => {
    const newComponents = [...components];
    newComponents.splice(index, 1);
    setComponents(newComponents);
  };

  const handleComponentChange = (index: number, field: keyof AssessmentComponent, value: string | number) => {
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setComponents(newComponents);
  };

  const totalWeightage = components.reduce((sum, comp) => sum + Number(comp.weightage || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      setError("Please select a course");
      return;
    }
    if (totalWeightage !== 100) {
      setError(`Total weightage must be exactly 100%. Current total: ${totalWeightage}%`);
      return;
    }
    if (components.some(c => !c.name || c.maxMarks <= 0)) {
      setError("Please fill all component names and ensure max marks are > 0");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await api.post(`/assessments/config/${selectedCourse}`, { components });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save configuration");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assessment Weightage Configuration</h1>
        <p className="text-gray-500 mt-1">Configure internal assessment components and their weightages</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a course</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.name} ({course.code})
              </option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Components</h3>
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Component
                </button>
              </div>

              {components.map((comp, index) => (
                <div key={index} className="flex flex-col md:flex-row items-start md:items-end gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Component Name (e.g., Assignment, Midterm)</label>
                    <input
                      type="text"
                      value={comp.name}
                      onChange={(e) => handleComponentChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Name"
                      required
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Weightage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={comp.weightage}
                      onChange={(e) => handleComponentChange(index, 'weightage', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Max Marks</label>
                    <input
                      type="number"
                      min="1"
                      value={comp.maxMarks}
                      onChange={(e) => handleComponentChange(index, 'maxMarks', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveComponent(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mt-2 md:mt-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className={`p-4 rounded-lg flex items-center justify-between ${
              totalWeightage === 100 ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              <span className="font-medium">Total Weightage:</span>
              <span className="font-bold text-lg">{totalWeightage}%</span>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>Configuration saved successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || totalWeightage !== 100}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Configuration
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
