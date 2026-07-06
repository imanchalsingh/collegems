import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, ShieldAlert } from 'lucide-react';
import api from '../api/axios'; // Adjust path to your axios instance

interface DashboardData {
  summary: { pending: number; approved: number };
  pendingRequests: any[];
  recentHistory: any[];
}

const HODLeaveDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // Remove '/api' from the start of the string
      const res = await api.get('/leaves/hod/dashboard'); 
      setData(res.data);
// ...
    } catch (error) {
      console.error("Failed to load dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

 const handleOverride = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    if (!window.confirm(`Are you sure you want to ${status} this request?`)) return;
// ...
    try {
      // Remove '/api' from the start of the string
      await api.put(`/leaves/hod/${leaveId}/override`, { status });
      fetchDashboardData(); 
// ...
    } catch (error) {
      alert("Failed to override status");
    }
  };

  if (loading) return <div className="p-6">Loading Departmental Data...</div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load data.</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Departmental Leave Oversight</h2>

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase">Pending Faculty Action</p>
            <p className="text-3xl font-bold text-gray-800">{data.summary.pending}</p>
          </div>
          <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase">Approved This Month</p>
            <p className="text-3xl font-bold text-gray-800">{data.summary.approved}</p>
          </div>
          <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
        </div>
      </div>

      {/* 2. Escalation / Emergency Action */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-red-100">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-red-800">Needs Escalation / HOD Override</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3">Student</th>
              <th className="px-6 py-3">Reason</th>
              <th className="px-6 py-3">Dates</th>
              <th className="px-6 py-3 text-right">Emergency Action</th>
            </tr>
          </thead>
          <tbody>
           {data.pendingRequests.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No pending requests require escalation.</td></tr>
            ) : (
              data.pendingRequests.map((req) => (
                <tr key={req._id} className="border-b">
                  {/* CHANGED req.student to req.user */}
                  <td className="px-6 py-4 font-medium">{req.user?.name} <span className="text-xs text-gray-400 block">{req.user?.studentId}</span></td>
                  <td className="px-6 py-4 text-gray-600">{req.reason}</td>
                  <td className="px-6 py-4">{new Date(req.startDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {/* CHANGED to Capitalized Statuses */}
                    <button onClick={() => handleOverride(req._id, 'Approved')} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">Force Approve</button>
                    <button onClick={() => handleOverride(req._id, 'Rejected')} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Departmental History */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Approved This Month</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3">Student</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Approval Date</th>
            </tr>
          </thead>
          <tbody>
           {data.recentHistory.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">No approved leaves this month.</td></tr>
            ) : (
              data.recentHistory.map((req) => (
                <tr key={req._id} className="border-b">
                  {/* CHANGED req.student to req.user */}
                  <td className="px-6 py-4 font-medium">{req.user?.name}</td>
                  {/* Your DB uses req.type, not req.leaveType */}
                  <td className="px-6 py-4">{req.type || "Casual"}</td>
                  <td className="px-6 py-4">{new Date(req.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HODLeaveDashboard;