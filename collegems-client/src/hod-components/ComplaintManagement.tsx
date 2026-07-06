import { useState, useEffect } from "react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { MessageSquare, CheckCircle, Clock, Edit } from "lucide-react";

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  
  const [commentText, setCommentText] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "",
    priority: "",
    resolutionNotes: ""
  });

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus, filterCategory]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      let url = "/complaints";
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterCategory) params.append("category", filterCategory);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await api.get(url);
      setComplaints(extractArray(res.data));
      if (selectedComplaint) {
        const updated = res.data.find((c: any) => c._id === selectedComplaint._id);
        if (updated) setSelectedComplaint(updated);
      }
    } catch (error) {
      console.error("Failed to fetch complaints", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedComplaint) return;
    try {
      const res = await api.post(`/complaints/${selectedComplaint._id}/comments`, { message: commentText });
      setSelectedComplaint(res.data);
      setCommentText("");
      setComplaints(complaints.map(c => c._id === res.data._id ? res.data : c));
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      const res = await api.patch(`/complaints/${selectedComplaint._id}`, statusForm);
      setSelectedComplaint(res.data);
      setShowStatusModal(false);
      setComplaints(complaints.map(c => c._id === res.data._id ? res.data : c));
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const openStatusModal = (complaint: any) => {
    setStatusForm({
      status: complaint.status,
      priority: complaint.priority,
      resolutionNotes: complaint.resolutionNotes || ""
    });
    setShowStatusModal(true);
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
      case "High": case "Critical": return "text-red-600 font-bold";
      case "Medium": return "text-amber-600 font-semibold";
      default: return "text-blue-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complaint Management</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white shadow-sm focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Academic">Academic</option>
            <option value="Hostel">Hostel</option>
            <option value="Transport">Transport</option>
            <option value="Technical">Technical</option>
            <option value="Administration">Administration</option>
          </select>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white shadow-sm focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 border rounded-xl bg-white overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700 flex justify-between items-center">
            <span>Inbox ({complaints.length})</span>
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {complaints.length === 0 && !loading ? (
              <div className="p-6 text-center text-gray-500">No complaints found.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {complaints.map((c) => (
                  <li 
                    key={c._id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-4 cursor-pointer transition-colors ${selectedComplaint?._id === c._id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{c.student.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>{c.status}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-800 line-clamp-1 mb-1">{c.title}</div>
                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                      <span className={`${getPriorityColor(c.priority)}`}>{c.priority}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2">
          {selectedComplaint ? (
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[700px]">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedComplaint.title}</h2>
                    <p className="text-sm text-gray-500">
                      From: <span className="font-semibold text-gray-800">{selectedComplaint.student.name}</span> ({selectedComplaint.student.studentId})
                    </p>
                  </div>
                  <button 
                    onClick={() => openStatusModal(selectedComplaint)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium"
                  >
                    <Edit className="w-4 h-4" /> Manage
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm bg-gray-50 p-4 rounded-lg">
                  <div><span className="text-gray-500">Category:</span> <div className="font-medium text-gray-900">{selectedComplaint.category}</div></div>
                  <div><span className="text-gray-500">Status:</span> <div className={`font-medium ${getStatusColor(selectedComplaint.status)} inline-block px-2 py-0.5 rounded-full text-xs mt-1`}>{selectedComplaint.status}</div></div>
                  <div><span className="text-gray-500">Priority:</span> <div className={`font-medium ${getPriorityColor(selectedComplaint.priority)}`}>{selectedComplaint.priority}</div></div>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 bg-white p-4 rounded-lg border">
                  <p className="whitespace-pre-wrap">{selectedComplaint.description}</p>
                  {selectedComplaint.evidenceUrl && (
                    <div className="mt-4 pt-4 border-t">
                      <a href={selectedComplaint.evidenceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                        📎 View Attached Evidence
                      </a>
                    </div>
                  )}
                </div>
                
                {selectedComplaint.resolutionNotes && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <h4 className="font-semibold text-emerald-800 mb-1 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Resolution Notes</h4>
                    <p className="text-sm text-emerald-700">{selectedComplaint.resolutionNotes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Communication Timeline</h4>
                {selectedComplaint.comments.length === 0 ? (
                  <div className="text-center text-gray-400 mt-6">No comments yet. Reply below to start the conversation.</div>
                ) : (
                  selectedComplaint.comments.map((comment: any, idx: number) => {
                    const isAdmin = comment.sender.role !== 'student';
                    return (
                      <div key={idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isAdmin ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                          <p className="text-sm">{comment.message}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="font-medium">{isAdmin ? 'You / Admin' : comment.sender.name}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 bg-white">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Type a reply to the student..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" disabled={!commentText.trim()} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    Send Reply
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 h-[700px] flex flex-col items-center justify-center text-gray-500">
              <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-lg font-medium text-gray-400">Select a complaint to manage</p>
            </div>
          )}
        </div>
      </div>

      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Manage Complaint</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" value={statusForm.status} onChange={e => setStatusForm({...statusForm, status: e.target.value})}>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Update Priority</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" value={statusForm.priority} onChange={e => setStatusForm({...statusForm, priority: e.target.value})}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes (Optional)</label>
                <textarea rows={4} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" value={statusForm.resolutionNotes} onChange={e => setStatusForm({...statusForm, resolutionNotes: e.target.value})} placeholder="Official resolution record..."></textarea>
                <p className="text-xs text-gray-500 mt-1">This note is visible to the student.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowStatusModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
