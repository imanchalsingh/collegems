import React, { useState, useEffect } from "react";
import { generateTimetable, getTimetables, getTimetableStatus } from "../../api/timetable";
import { Link } from "react-router";

export const TimetableGenerator = () => {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [timetables, setTimetables] = useState<any[]>([]);

  useEffect(() => {
    fetchTimetables();
    
    // Simple polling for in-progress timetables
    const interval = setInterval(() => {
      fetchTimetables();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTimetables = async () => {
    try {
      const res = await getTimetables();
      if (res.success) {
        setTimetables(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await generateTimetable({
        name,
        department,
        semester: semester ? Number(semester) : undefined,
      });
      setName("");
      setDepartment("");
      setSemester("");
      fetchTimetables();
    } catch (err) {
      console.error(err);
      alert("Failed to start generation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 dark:text-white">Timetable Generator</h2>
      
      <form onSubmit={handleGenerate} className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name</label>
            <input 
              required
              type="text" 
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spring 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Department</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Semester (Optional)</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              value={semester}
              onChange={e => setSemester(Number(e.target.value))}
              placeholder="e.g. 2"
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? "Starting..." : "Generate Timetable"}
        </button>
      </form>

      <h3 className="text-xl font-semibold mb-3 dark:text-white">Recent Generations</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="py-2 px-4 border-b text-left dark:text-gray-200">Name</th>
              <th className="py-2 px-4 border-b text-left dark:text-gray-200">Status</th>
              <th className="py-2 px-4 border-b text-left dark:text-gray-200">Department</th>
              <th className="py-2 px-4 border-b text-left dark:text-gray-200">Action</th>
            </tr>
          </thead>
          <tbody>
            {timetables.map(t => (
              <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-2 px-4 border-b dark:text-gray-300">{t.name}</td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded text-xs font-semibold
                    ${t.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      t.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {t.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 px-4 border-b dark:text-gray-300">{t.department || "N/A"}</td>
                <td className="py-2 px-4 border-b">
                  {t.status === "completed" && (
                    <Link to={`/admin/timetable/${t._id}`} className="text-blue-500 hover:underline">
                      View Grid
                    </Link>
                  )}
                  {t.status === "failed" && (
                    <button onClick={() => alert(JSON.stringify(t.conflictReport))} className="text-red-500 hover:underline">
                      View Error
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {timetables.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">No timetables generated yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
