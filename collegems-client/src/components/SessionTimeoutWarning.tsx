import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useSessionTimeout } from '../hooks/useSessionTimeout';

interface Props {
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export default function SessionTimeoutWarning({ timeoutMinutes = 30, warningMinutes = 5 }: Props) {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const { showWarning, remainingSeconds, extendSession } = useSessionTimeout(
    timeoutMinutes,
    warningMinutes,
    handleLogout
  );

  if (!showWarning) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Session Expiring Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You've been inactive for a while. For your security, you will be automatically logged out in:
          </p>
          <div className="text-4xl font-mono font-bold text-red-600 dark:text-red-500 mb-8 bg-red-50 dark:bg-red-900/20 px-6 py-3 rounded-lg border border-red-100 dark:border-red-900/50">
            {timeString}
          </div>
          <div className="flex w-full gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Log Out Now
            </button>
            <button
              onClick={extendSession}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-600/20"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
