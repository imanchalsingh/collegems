import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Calendar, Clock, BookOpen, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { getAcademicLabel } from "../utils/academicLabels";
import { useAcademicLabels } from "../hooks/useAcademicLabels";

interface Course {
  _id: string;
  name: string;
  code: string;
}

interface Question {
  type: 'MCQ' | 'ShortAnswer';
  text: string;
  options: string[];
  correctAnswer: string;
  marks: number;
}

export const QuizCreator: React.FC = () => {
  const { data: academicLabels } = useAcademicLabels();
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingMarks, setPassingMarks] = useState(40);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses/all');
      setCourses(response.data);
    } catch (err) {
      console.error('Failed to load courses', err);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { type: 'MCQ', text: '', options: ['', '', '', ''], correctAnswer: '', marks: 1 }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSaveQuiz = async () => {
    if (!title || !courseId || questions.length === 0) {
      setError('Please provide title, course, and at least one question.');
      return;
    }
    
    // Check validation of questions
    for (let q of questions) {
      if (!q.text || !q.correctAnswer) {
        setError('Please fill in all question texts and correct answers.');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      // Create Quiz Metadata
      const quizRes = await api.post('/quizzes', {
        title,
        description,
        course: courseId,
        timeLimit,
        passingMarks,
        status: 'published' // Default to published for MVP
      });

      // Add Questions
      await api.post(`/quizzes/${quizRes.data.data._id}/questions`, {
        questions
      });

      setSuccessMessage('Quiz successfully created and published!');
      setTitle('');
      setDescription('');
      setCourseId('');
      setQuestions([]);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Quiz</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quiz Title</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Midterm Examination"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select {getAcademicLabel("course", academicLabels)}</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">-- Select {getAcademicLabel("course", academicLabels)} --</option>
            {courses.map(c => (
              <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description / Instructions</label>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Limit (Minutes)</label>
          <input
            type="number"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Passing Marks</label>
          <input
            type="number"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            value={passingMarks}
            onChange={(e) => setPassingMarks(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Questions</h3>
        <button
          onClick={handleAddQuestion}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      <div className="space-y-6 mb-8">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 relative">
            <button
              onClick={() => handleRemoveQuestion(qIndex)}
              className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-2"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question {qIndex + 1}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marks</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={q.marks}
                  onChange={(e) => handleQuestionChange(qIndex, 'marks', Number(e.target.value))}
                />
              </div>
            </div>

            {q.type === 'MCQ' && (
              <div className="space-y-3 pl-4 border-l-2 border-blue-500">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correctAnswer === opt && opt !== ''}
                      onChange={() => handleQuestionChange(qIndex, 'correctAnswer', opt)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <input
                      type="text"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder={`Option ${oIndex + 1}`}
                      value={opt}
                      onChange={(e) => {
                        handleOptionChange(qIndex, oIndex, e.target.value);
                        // If it was the correct answer, update the correct answer reference too
                        if (q.correctAnswer === q.options[oIndex]) {
                          handleQuestionChange(qIndex, 'correctAnswer', e.target.value);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {questions.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
            No questions added yet. Click 'Add Question' to start building your quiz.
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSaveQuiz}
          disabled={loading}
          className={`flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Save className="w-5 h-5" />
          {loading ? 'Saving...' : 'Publish Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizCreator;
