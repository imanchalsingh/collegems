import { useState, useEffect } from "react";
// 1. Changed standard axios to your custom api instance
import api from "../api/axios"; 

const ReminderManagement = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      // 2. Used custom api and adjusted the route 
      // (Your custom api likely already has the '/api' base URL attached)
      const response = await api.get("/reminders/pending-users");
      
      // 3. Safely set the array (fallback to empty array if data is missing)
      setPendingUsers(response.data?.data || response.data || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setPendingUsers([]); // Force it to be an array on error so .length won't crash
    }
  };

  const handleQueueReminders = async () => {
    setLoading(true);
    try {
      const userIds = pendingUsers.map((user: any) => user._id);
      await api.post("/reminders/queue", { userIds });
      alert("Reminders have been added to the queue!");
      // Remove queued users from the list so we don't queue them twice
      setPendingUsers([]);
    } catch (error) {
      console.error("Failed to queue reminders", error);
      alert("Failed to queue reminders. Check the console.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Pending Profile Completions</h2>
      
      {/* 4. Added a safety check before reading .length */}
      {!pendingUsers || pendingUsers.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">All users have completed their profiles!</p>
      ) : (
        <>
          <ul className="mb-6 divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {pendingUsers.map((user: any) => (
              <li key={user._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div>
                  <p className="font-semibold">{user.name || "Unknown Name"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <span className="mt-2 sm:mt-0 inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  {user.role}
                </span>
              </li>
            ))}
          </ul>
          <button 
            onClick={handleQueueReminders} 
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Queuing Reminders..." : `Generate Reminders (${pendingUsers.length})`}
          </button>
        </>
      )}
    </div>
  );
};

export default ReminderManagement;