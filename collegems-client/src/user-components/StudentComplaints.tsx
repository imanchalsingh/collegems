import { useState, useEffect } from "react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { Plus, MessageSquare, AlertCircle, CheckCircle, Clock } from "lucide-react";
import useFormTracker from "../hooks/useFormTracker";

export default function StudentComplaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Academic",
    priority: "Medium",
    evidenceUrl: ""
  });
  
  const [commentText, setCommentText] = useState("");

  const { trackField, markSubmitted } = useFormTracker({ formId: "student_complaint" });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get("/complaints/my-complaints");
      setComplaints(extractArray(res.data));
    } catch (error) {
      console.error("Failed to fetch complaints", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/complaints", form);
      setShowModal(false);
      markSubmitted();
      setForm({ title: "", description: "", category: "Academic", priority: "Medium", evidenceUrl: "" });
      fetchComplaints();
    } catch (error) {
      console.error("Failed to submit complaint", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedComplaint) return;
    try {
      const res = await api.post(`/complaints/${selectedComplaint._id}/comments`, { message: commentText });
      setSelectedComplaint(res.data);
      setCommentText("");
      // Update in the main list
      setComplaints(complaints.map(c => c._id === res.data._id ? res.data : c));
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Submitted": return "bg-blue-100 text-blue-800";
      case "Under Review": return "bg-amber-100 text-amber-800";
      case "In Progress": return "bg-purple-100 text-purple-800";
      case "Resolved": return "bg-emerald-100 text-emerald-800";
      case "Closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": case "Critical": return "text-red-600";
      case "Medium": return "text-amber-600";
      default: return "text-blue-600";
    }
  };

  if (loading) return <div className="p-6 text-center">Loading complaints...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Complaints</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Raise Complaint
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          {complaints.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>No complaints raised yet.</p>
            </div>
          ) : (
            complaints.map(c => (
              <div 
                key={c._id}
                onClick={() => setSelectedComplaint(c)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedComplaint?._id === c._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(c.status)}`}>{c.status}</span>
                  <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-semibold text-gray-900 line-clamp-1">{c.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{c.description}</p>
                <div className="flex justify-between items-center mt-3 text-xs font-medium">
                  <span className="text-gray-600">{c.category}</span>
                  <span className={`${getPriorityColor(c.priority)} flex items-center gap-1`}>
                    <AlertCircle className="w-3 h-3" /> {c.priority}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="col-span-1 md:col-span-2">
          {selectedComplaint ? (
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[600px]">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedComplaint.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Submitted on {new Date(selectedComplaint.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getStatusColor(selectedComplaint.status)}`}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-gray-50 p-4 rounded-lg">
                  <div><span className="text-gray-500">Category:</span> <span className="font-medium text-gray-900">{selectedComplaint.category}</span></div>
                  <div><span className="text-gray-500">Priority:</span> <span className="font-medium text-gray-900">{selectedComplaint.priority}</span></div>
                  {selectedComplaint.assignedTo && (
                    <div className="col-span-2"><span className="text-gray-500">Assigned To:</span> <span className="font-medium text-gray-900">{selectedComplaint.assignedTo.name} ({selectedComplaint.assignedTo.department})</span></div>
                  )}
                </div>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <p className="whitespace-pre-wrap">{selectedComplaint.description}</p>
                </div>
                {selectedComplaint.evidenceUrl && (
                  <div className="mt-4">
                    <a href={selectedComplaint.evidenceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                      View Attachment
                    </a>
                  </div>
                )}
                {selectedComplaint.resolutionNotes && (
                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <h4 className="font-semibold text-emerald-800 mb-1 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Resolution Notes</h4>
                    <p className="text-sm text-emerald-700">{selectedComplaint.resolutionNotes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {selectedComplaint.comments.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">No comments yet.</div>
                ) : (
                  selectedComplaint.comments.map((comment: any, idx: number) => {
                    const isStudent = comment.sender.role === 'student';
                    return (
                      <div key={idx} className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isStudent ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                          <p className="text-sm">{comment.message}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="font-medium">{comment.sender.name}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {selectedComplaint.status !== "Closed" && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" disabled={!commentText.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 h-[600px] flex flex-col items-center justify-center text-gray-500">
              <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
              <p>Select a complaint to view details and communication.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Raise New Complaint</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" value={form.title} onChange={e => setForm({...form, title: e.target.value})} onBlur={() => trackField("title", 5)} placeholder="Brief title of the issue" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" value={form.category} onChange={e => { setForm({...form, category: e.target.value}); trackField("category", 5); }}>
                    <option value="Academic">Academic</option>
                    <option value="Hostel">Hostel</option>
                    <option value="Transport">Transport</option>
                    <option value="Technical">Technical</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" value={form.priority} onChange={e => { setForm({...form, priority: e.target.value}); trackField("priority", 5); }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea required rows={4} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" value={form.description} onChange={e => setForm({...form, description: e.target.value})} onBlur={() => trackField("description", 5)} placeholder="Detailed description of the issue..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidence URL (Optional)</label>
                <input type="url" className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" value={form.evidenceUrl} onChange={e => setForm({...form, evidenceUrl: e.target.value})} onBlur={() => trackField("evidenceUrl", 5)} placeholder="Link to image or document" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
