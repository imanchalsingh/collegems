import { useState, useEffect } from "react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { Users, History } from "lucide-react";

export default function StudentMentorshipView() {
  const [mentorships, setMentorships] = useState<any[]>([]);
  const [selectedMentorshipId, setSelectedMentorshipId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMentorships();
  }, []);

  useEffect(() => {
    if (selectedMentorshipId) {
      fetchHistory(selectedMentorshipId);
    }
  }, [selectedMentorshipId]);

  const fetchMentorships = async () => {
    try {
      const res = await api.get("/mentorships/my-mentors");
      setMentorships(extractArray(res.data));
      if (res.data.length > 0) {
        setSelectedMentorshipId(res.data[0]._id);
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch mentors", error);
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

  if (loading) return <div>Loading mentors...</div>;

  if (mentorships.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Users className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-gray-500">You do not have a mentor assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mentors List */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 col-span-1">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> My Mentors
          </h2>
          <div className="space-y-3">
            {mentorships.map(m => (
              <div 
                key={m._id} 
                onClick={() => setSelectedMentorshipId(m._id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMentorshipId === m._id 
                    ? "bg-blue-50 border-blue-200" 
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <p className="font-semibold text-gray-900">{m.mentor.name}</p>
                <p className="text-sm text-gray-500">{m.mentor.department}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mentorship Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 col-span-1 md:col-span-2">
          {selectedMentorshipId ? (
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4"><History className="w-5 h-5" /> Mentorship Progress History</h3>
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-gray-200 text-xs font-semibold rounded uppercase">
                        {h.historyType}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(h.historyDate).toLocaleDateString()}
                      </span>
                    </div>
                    {h.historyType === "meeting" && (
                      <div>
                        <p className="font-medium">{h.discussionSummary}</p>
                        {h.actionItems?.length > 0 && <p className="text-sm text-gray-600 mt-1">Actions: {h.actionItems.join(", ")}</p>}
                      </div>
                    )}
                    {h.historyType === "concern" && (
                      <div>
                        <p className="font-medium text-amber-600">{h.type.toUpperCase()}</p>
                        <p className="text-gray-800">{h.description}</p>
                        <span className="text-xs text-gray-500">Status: {h.status}</span>
                      </div>
                    )}
                    {h.historyType === "performance" && (
                      <div>
                        <p className="font-medium text-emerald-600">Progress: {h.academicProgress}</p>
                        <p className="text-sm text-gray-800 mt-1">Goals: {h.goals}</p>
                        <p className="text-sm text-gray-800">Recommendations: {h.recommendations}</p>
                      </div>
                    )}
                  </div>
                ))}
                {history.length === 0 && <p className="text-gray-500">No records found.</p>}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
