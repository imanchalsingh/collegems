import React, { useState, useEffect } from 'react';
import { Play, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getAcademicLabel } from "../utils/academicLabels";
import { useAcademicLabels } from "../hooks/useAcademicLabels";

interface Quiz {
  _id: string;
  title: string;
  description: string;
  course: { _id: string; name: string; code: string };
  timeLimit: number;
  status: string;
  scheduledAt: string;
}

export const StudentQuizList: React.FC = () => {
  const { data: academicLabels } = useAcademicLabels();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/quizzes');
      setQuizzes(response.data.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeQuiz = (quizId: string) => {
    navigate(`/quiz/take/${quizId}`);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading quizzes...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upcoming Quizzes</h2>
      
      {quizzes.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">You don't have any upcoming quizzes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
              <div className="mb-4 flex-1">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full mb-2 inline-block">
                  {quiz.course?.code || getAcademicLabel("course", academicLabels)}
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{quiz.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                  {quiz.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {quiz.timeLimit} mins
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleTakeQuiz(quiz._id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" /> Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentQuizList;
