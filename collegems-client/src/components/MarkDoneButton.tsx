import { useState } from 'react';
import { api } from '../utils/api'; // Adjust path to your axios instance

interface MarkDoneButtonProps {
  assignmentId: string;
  initialIsDone: boolean;
}

export default function MarkDoneButton({ assignmentId, initialIsDone }: MarkDoneButtonProps) {
  const [isDone, setIsDone] = useState(initialIsDone);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents clicking the card from opening the assignment
    if (isLoading) return;

    // Optimistic UI update
    const nextState = !isDone;
    setIsDone(nextState);
    setIsLoading(true);

    try {
      // Matches the singular backend route structure
      await api.post(`/assignment/${assignmentId}/complete`);
    } catch (error) {
      console.error("Failed to toggle completion status", error);
      // Revert if API fails
      setIsDone(!nextState);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors text-sm font-medium ${
        isDone 
          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {/* Simple Check Icon */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={isDone ? 'text-green-600' : 'text-gray-300'}
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      {isDone ? 'Done' : 'Mark as Done'}
    </button>
  );
}