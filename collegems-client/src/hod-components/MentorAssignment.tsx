import { useState, useEffect } from "react";
import api from "../api/axios";
import { Users, Plus } from "lucide-react";
import { extractArray } from "../utils/apiHelpers";

export default function MentorAssignment() {
  const [mentorships, setMentorships] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMentor, setSelectedMentor] = useState("");
  const [selectedMentee, setSelectedMentee] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, tRes, sRes] = await Promise.all([
        api.get("/mentorships"),
        api.get("/users/teachers"),
        api.get("/users/students?limit=0"),
      ]);
      setMentorships(mRes.data);
      setTeachers(tRes.data);
      setStudents(extractArray(sRes.data));
    } catch (error) {
      console.error("Failed to fetch mentorship data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor || !selectedMentee) return;

    try {
      await api.post("/mentorships", { mentorId: selectedMentor, menteeId: selectedMentee });
      setSelectedMentor("");
      setSelectedMentee("");
      fetchData();
    } catch (error) {
      console.error("Failed to assign mentor", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2"><Users className="w-5 h-5"/> Assign Mentor</h2>
        <form onSubmit={handleAssign} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mentor (Teacher)</label>
            <select 
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={selectedMentor}
              onChange={e => setSelectedMentor(e.target.value)}
              required
            >
              <option value="">Select Mentor</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.name} ({t.department})</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mentee (Student)</label>
            <select 
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={selectedMentee}
              onChange={e => setSelectedMentee(e.target.value)}
              required
            >
              <option value="">Select Mentee</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.course} - {s.semester})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 h-[42px] flex items-center gap-2">
            <Plus className="w-4 h-4"/> Assign
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">Mentee</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">Mentor</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">Assigned Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {mentorships.map(m => (
              <tr key={m._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 dark:text-white">{m.mentee?.name}</p>
                  <p className="text-sm text-gray-500">{m.mentee?.course}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 dark:text-white">{m.mentor?.name}</p>
                  <p className="text-sm text-gray-500">{m.mentor?.department}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(m.assignedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mentorships.length === 0 && <p className="p-6 text-center text-gray-500">No mentorships assigned yet.</p>}
      </div>
    </div>
  );
}
