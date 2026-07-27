import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// Define the expected shape of the student data based on acceptance criteria
interface StudentData {
  name: string;
  studentId: string; // Updated from rollNumber
  semester: string;
  course: string;    // Updated from section
  department: string;
}

const StudentProfile: React.FC = () => {
  const [profile, setProfile] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Call the /me route using your custom api instance
        const response = await api.get('/users/me'); 
        
        console.log("🔥 SUCCESSFUL BACKEND RESPONSE:", response.data);
        
        // Set the state using the returned user data
        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching student profile:", err);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-gray-600 font-medium animate-pulse">Loading academic details...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center font-medium bg-red-50 rounded-lg">{error}</div>;
  }

  return (
    <div className="flex justify-center items-center p-4 min-h-[60vh]">
      {/* Mobile-responsive card wrapper */}
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          My Academic Profile
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{profile?.name || 'N/A'}</p>
          </div>
          
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Roll Number / ID</label>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{profile?.studentId || 'N/A'}</p>
          </div>
          
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</label>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{profile?.department || 'N/A'}</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Semester</label>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{profile?.semester || 'N/A'}</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Section / Course</label>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{profile?.course || 'N/A'}</p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200 leading-relaxed flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>If any of your academic details (Semester, Section, etc.) are incorrect, please report it to your HOD or the administration office immediately to prevent grading issues.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;