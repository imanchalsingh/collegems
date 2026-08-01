import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../api/axios';
import { useProctoring } from '../components/proctoring/useProctoring';
import ProctoringCanvas from '../components/proctoring/ProctoringCanvas';

interface Question {
  _id: string;
  type: 'MCQ' | 'ShortAnswer';
  text: string;
  options?: string[];
  marks: number;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  timeLimit: number;
}

export const QuizTaker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proctorNote, setProctorNote] = useState<string | null>(null);

  const fetchQuizData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/quizzes/${id}`);
      setQuiz(response.data.data.quiz);
      setQuestions(response.data.data.questions);
      setTimeLeft(response.data.data.quiz.timeLimit * 60);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  const handleSubmit = useCallback(async (reason?: string) => {
    if (submitting || submitted) return;

    try {
      setSubmitting(true);

      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));

      await api.post(`/quizzes/${id}/submit`, {
        answers: formattedAnswers,
        proctoringAutoSubmit: reason === 'proctoring',
      });
      if (reason === 'proctoring') {
        setProctorNote('Your quiz was auto-submitted due to repeated proctoring violations.');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to submit quiz');
      setSubmitting(false);
    }
  }, [answers, id, submitting, submitted]);

  const { status: proctorStatus, attachVideo, stop: stopProctoring } = useProctoring({
    quizId: id,
    enabled: Boolean(id) && !loading && !submitted && !error,
    onForceSubmit: () => {
      void handleSubmit('proctoring');
    },
    onWarning: (message) => setProctorNote(message),
  });

  useEffect(() => {
    if (submitted) {
      void stopProctoring();
    }
  }, [submitted, stopProctoring]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted && !loading) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && !loading && !submitted) {
      void handleSubmit();
    }
  }, [timeLeft, submitted, loading, handleSubmit]);

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
        Loading your exam environment...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl max-w-lg text-center flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Error</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-lg text-center border border-gray-200 dark:border-gray-700">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Quiz Submitted Successfully
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Your answers have been recorded. You can view your grades in the Results section.
          </p>
          {proctorNote && (
            <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {proctorNote}
            </p>
          )}
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{quiz?.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Question {currentQuestionIdx + 1} of {questions.length}
            </p>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg ${
              timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}
          >
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
        {proctorNote && (
          <div className="max-w-5xl mx-auto mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {proctorNote}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col">
          {currentQ && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-10 flex-1">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed">
                  {currentQuestionIdx + 1}. {currentQ.text}
                </h2>
                <span className="shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                  {currentQ.marks} mark{currentQ.marks > 1 ? 's' : ''}
                </span>
              </div>

              <div className="mt-8">
                {currentQ.type === 'MCQ' ? (
                  <div className="space-y-3">
                    {currentQ.options?.map((opt, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                          answers[currentQ._id] === opt
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={currentQ._id}
                          value={opt}
                          checked={answers[currentQ._id] === opt}
                          onChange={() => handleAnswerSelect(currentQ._id, opt)}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-3 text-gray-800 dark:text-gray-200">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
                    placeholder="Type your answer here..."
                    value={answers[currentQ._id] || ''}
                    onChange={(e) => handleAnswerSelect(currentQ._id, e.target.value)}
                  />
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIdx === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                currentQuestionIdx === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
              }`}
            >
              <ChevronLeft className="w-5 h-5" /> Previous
            </button>

            {currentQuestionIdx < questions.length - 1 ? (
              <button
                onClick={() =>
                  setCurrentQuestionIdx((prev) => Math.min(questions.length - 1, prev + 1))
                }
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Are you sure you want to submit your exam? You cannot change your answers after submission.',
                    )
                  ) {
                    void handleSubmit();
                  }
                }}
                disabled={submitting}
                className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md ${
                  submitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            )}
          </div>
        </div>

        <aside className="lg:w-56 shrink-0 lg:sticky lg:top-24 self-start">
          <ProctoringCanvas status={proctorStatus} attachVideo={attachVideo} />
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            Stay on this tab with your face visible. Tab switches and multi-face events are logged.
          </p>
        </aside>
      </main>
    </div>
  );
};

export default QuizTaker;
