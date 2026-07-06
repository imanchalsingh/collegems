import { useState, useEffect } from "react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { Users, Calendar, AlertTriangle, TrendingUp, History, X } from "lucide-react";

export default function MentorshipManagement() {
  const [mentees, setMentees] = useState<any[]>([]);
  const [selectedMentorshipId, setSelectedMentorshipId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchMentees();
  }, []);

  useEffect(() => {
    if (selectedMentorshipId) {
      fetchHistory(selectedMentorshipId);
    }
  }, [selectedMentorshipId]);

  const fetchMentees = async () => {
    try {
      const res = await api.get("/mentorships/my-mentees");
      setMentees(extractArray(res.data));
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch mentees", error);
      setLoading(false);
    }
  };

  const fetchHistory = async (id: string) => {
    try {
      const res = await api.get(`/mentorships/${id}/history`);
      setHistory(extractArray(res.data));
    } catch (error) {
      console.error("Failed to fetch history", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentorshipId || !modalType) return;

    try {
      if (modalType === "meeting") {
        await api.post(`/mentorships/${selectedMentorshipId}/meetings`, {
          date: formData.date,
          discussionSummary: formData.summary,
          actionItems: formData.actionItems?.split(",").map((i: string) => i.trim()),
          notes: formData.notes
        });
      } else if (modalType === "concern") {
        await api.post(`/mentorships/${selectedMentorshipId}/concerns`, {
          type: formData.type,
          description: formData.description,
        });
      } else if (modalType === "performance") {
        await api.post(`/mentorships/${selectedMentorshipId}/performance`, {
          academicProgress: formData.academicProgress,
          strengths: formData.strengths,
          areasForImprovement: formData.areasForImprovement,
          goals: formData.goals,
          recommendations: formData.recommendations
        });
      }
      setModalType(null);
      setFormData({});
      fetchHistory(selectedMentorshipId);
    } catch (error) {
      console.error("Failed to submit", error);
    }
  };

  if (loading) return <div>Loading mentees...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mentees List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 col-span-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> My Mentees
          </h2>
          <div className="space-y-3">
            {mentees.map(m => (
              <div 
                key={m._id} 
                onClick={() => setSelectedMentorshipId(m._id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMentorshipId === m._id 
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800" 
                    : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white">{m.mentee.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{m.mentee.studentId} • {m.mentee.course}</p>
              </div>
            ))}
            {mentees.length === 0 && <p className="text-gray-500 text-sm">No mentees assigned.</p>}
          </div>
        </div>

        {/* Mentorship Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 col-span-1 md:col-span-2">
          {selectedMentorshipId ? (
            <div>
              <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mentorship Record</h2>
                <div className="flex gap-2">
                  <button onClick={() => setModalType("meeting")} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 text-sm">
                    <Calendar className="w-4 h-4" /> Add Meeting
                  </button>
                  <button onClick={() => setModalType("concern")} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 flex items-center gap-1 text-sm">
                    <AlertTriangle className="w-4 h-4" /> Add Concern
                  </button>
                  <button onClick={() => setModalType("performance")} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 flex items-center gap-1 text-sm">
                    <TrendingUp className="w-4 h-4" /> Add Performance
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 dark:text-white"><History className="w-5 h-5" /> Progress History</h3>
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-xs font-semibold rounded uppercase">
                        {h.historyType}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(h.historyDate).toLocaleDateString()}
                      </span>
                    </div>
                    {h.historyType === "meeting" && (
                      <div>
                        <p className="font-medium dark:text-white">{h.discussionSummary}</p>
                        {h.actionItems?.length > 0 && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Actions: {h.actionItems.join(", ")}</p>}
                      </div>
                    )}
                    {h.historyType === "concern" && (
                      <div>
                        <p className="font-medium text-amber-600">{h.type.toUpperCase()}</p>
                        <p className="text-gray-800 dark:text-gray-200">{h.description}</p>
                        <span className="text-xs text-gray-500">Status: {h.status}</span>
                      </div>
                    )}
                    {h.historyType === "performance" && (
                      <div>
                        <p className="font-medium text-emerald-600">Progress: {h.academicProgress}</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">Goals: {h.goals}</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">Recommendations: {h.recommendations}</p>
                      </div>
                    )}
                  </div>
                ))}
                {history.length === 0 && <p className="text-gray-500">No records found for this student.</p>}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Users className="w-12 h-12 mb-2 opacity-50" />
              <p>Select a mentee to view their records</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                {modalType === "meeting" && "Log Meeting"}
                {modalType === "concern" && "Record Concern"}
                {modalType === "performance" && "Add Performance Review"}
              </h3>
              <button onClick={() => setModalType(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === "meeting" && (
                <>
                  <input type="date" required className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, date: e.target.value})} />
                  <textarea placeholder="Discussion Summary" required className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, summary: e.target.value})} />
                  <input type="text" placeholder="Action items (comma separated)" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, actionItems: e.target.value})} />
                </>
              )}

              {modalType === "concern" && (
                <>
                  <select required className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="">Select Type</option>
                    <option value="academic">Academic</option>
                    <option value="personal">Personal</option>
                    <option value="administrative">Administrative</option>
                  </select>
                  <textarea placeholder="Description" required className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, description: e.target.value})} />
                </>
              )}

              {modalType === "performance" && (
                <>
                  <input type="text" placeholder="Academic Progress (e.g., Improving, Needs work)" required className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, academicProgress: e.target.value})} />
                  <input type="text" placeholder="Strengths" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, strengths: e.target.value})} />
                  <input type="text" placeholder="Areas for Improvement" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, areasForImprovement: e.target.value})} />
                  <input type="text" placeholder="Goals" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, goals: e.target.value})} />
                  <textarea placeholder="Recommendations" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    onChange={e => setFormData({...formData, recommendations: e.target.value})} />
                </>
              )}

              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
