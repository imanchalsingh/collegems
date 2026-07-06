import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { Check, X, Clock } from "lucide-react";

interface Booking {
  _id: string;
  resource: { _id: string; name: string; type: string };
  user: { _id: string; name: string; email: string; role: string };
  purpose: string;
  startTime: string;
  endTime: string;
  status: string;
  remarks?: string;
  createdAt: string;
}

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get("/bookings");
      setBookings(data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    const remarks = prompt(`Enter optional remarks for marking this as ${status}:`);
    if (remarks === null) return; // cancelled prompt

    try {
      await api.put(
        `/bookings/${id}/status`,
        { status, remarks }
      );
      fetchBookings();
    } catch (error: any) {
      alert(error.response?.data?.message || `Failed to update status`);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === "all") return true;
    return b.status === filter;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Booking Management</h1>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="border p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="all">All Bookings</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((b) => (
                <tr key={b._id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{b.resource?.name}</div>
                    <div className="text-sm text-gray-900 mt-1">{new Date(b.startTime).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(b.startTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'})} - 
                      {new Date(b.endTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'})}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{b.user?.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{b.user?.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={b.purpose}>{b.purpose}</div>
                    <div className="text-xs text-gray-400 mt-1">Requested: {new Date(b.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      b.status === 'approved' ? 'bg-green-100 text-green-800' :
                      b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      b.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {b.status}
                    </span>
                    {b.remarks && <div className="text-xs mt-1 text-gray-500 max-w-[150px] truncate" title={b.remarks}>{b.remarks}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {b.status === "pending" && (
                      <div className="flex space-x-2">
                        <button onClick={() => handleStatusUpdate(b._id, "approved")} className="text-green-600 hover:text-green-900 bg-green-50 p-1 rounded" title="Approve">
                          <Check className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleStatusUpdate(b._id, "rejected")} className="text-red-600 hover:text-red-900 bg-red-50 p-1 rounded" title="Reject">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {b.status === "approved" && (
                      <button onClick={() => handleStatusUpdate(b._id, "completed")} className="text-blue-600 hover:text-blue-900 text-xs font-semibold">Mark Completed</button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
