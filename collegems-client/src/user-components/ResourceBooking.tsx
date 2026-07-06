import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { Search, Calendar, Clock, PlusCircle } from "lucide-react";

interface Resource {
  _id: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  features: string[];
}

interface Booking {
  _id: string;
  resource: Resource;
  purpose: string;
  startTime: string;
  endTime: string;
  status: string;
  remarks?: string;
}

const ResourceBooking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"book" | "history">("book");
  
  // Booking Form State
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [resourceType, setResourceType] = useState("");
  
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  
  // History State
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchMyBookings();
    }
  }, [activeTab]);

  const fetchMyBookings = async () => {
    try {
      const { data } = await api.get("/bookings/my");
      setMyBookings(data);
    } catch (error) {
      console.error("Error fetching my bookings:", error);
    }
  };

  const handleCheckAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) return;
    
    setLoading(true);
    try {
      const startDateTime = new Date(`${date}T${startTime}:00Z`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}:00Z`).toISOString();

      let url = `/bookings/available?startTime=${startDateTime}&endTime=${endDateTime}`;
      if (resourceType) url += `&type=${resourceType}`;

      const { data } = await api.get(url);
      setAvailableResources(data);
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to check availability");
    } finally {
      setLoading(false);
    }
  };

  const handleBookResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource || !purpose) return;

    try {
      const startDateTime = new Date(`${date}T${startTime}:00Z`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}:00Z`).toISOString();

      await api.post(
        "/bookings",
        {
          resource: selectedResource,
          purpose,
          startTime: startDateTime,
          endTime: endDateTime,
        }
      );

      alert("Booking request submitted successfully!");
      setAvailableResources([]);
      setSelectedResource("");
      setPurpose("");
      setActiveTab("history");
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to book resource");
    }
  };

  const cancelBooking = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.put(`/bookings/${id}/cancel`);
      fetchMyBookings();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to cancel booking");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Resource Booking</h1>
        <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "book" 
                ? "bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            onClick={() => setActiveTab("book")}
          >
            Book Resource
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "history" 
                ? "bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            onClick={() => setActiveTab("history")}
          >
            My Bookings
          </button>
        </div>
      </div>

      {activeTab === "book" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white dark:bg-gray-900 p-6 rounded-lg shadow border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">1. Check Availability</h2>
            <form onSubmit={handleCheckAvailability} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input 
                  type="date" 
                  required 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    required 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                  <input 
                    type="time" 
                    required 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource Type (Optional)</label>
                <select 
                  value={resourceType} 
                  onChange={(e) => setResourceType(e.target.value)} 
                  className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Types</option>
                  <option value="classroom">Classroom</option>
                  <option value="lab">Lab</option>
                  <option value="seminar_hall">Seminar Hall</option>
                  <option value="projector">Projector</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Checking..." : <><Search className="w-4 h-4" /> Search Available</>}
              </button>
            </form>
          </div>

          <div className="col-span-2 bg-white dark:bg-gray-900 p-6 rounded-lg shadow border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2. Select & Book</h2>
            
            {availableResources.length > 0 ? (
              <form onSubmit={handleBookResource}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-h-64 overflow-y-auto pr-2">
                  {availableResources.map((res) => (
                    <label 
                      key={res._id} 
                      className={`cursor-pointer border rounded-lg p-4 flex flex-col transition ${
                        selectedResource === res._id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">{res.name}</span>
                        <input 
                          type="radio" 
                          name="resource" 
                          value={res._id} 
                          checked={selectedResource === res._id} 
                          onChange={() => setSelectedResource(res._id)} 
                          className="mt-1 accent-blue-600"
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase mt-1 tracking-wider">{res.type.replace('_', ' ')}</span>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                        {res.capacity > 0 && <div>Capacity: {res.capacity}</div>}
                        {res.location && <div>Location: {res.location}</div>}
                      </div>
                    </label>
                  ))}
                </div>

                {selectedResource && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Booking Purpose</label>
                    <textarea 
                      required 
                      value={purpose} 
                      onChange={(e) => setPurpose(e.target.value)} 
                      rows={3} 
                      className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded focus:ring-blue-500 focus:border-blue-500 mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" 
                      placeholder="Why do you need this resource?"
                    ></textarea>
                    <button 
                      type="submit" 
                      className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" /> Request Booking
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 min-h-[200px]">
                <Calendar className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                <p>Search for a date and time to see available resources.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-x-auto border border-gray-100 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purpose</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {myBookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{booking.resource?.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{booking.resource?.type?.replace('_', ' ')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{new Date(booking.startTime).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(booking.startTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'})} - 
                      {new Date(booking.endTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'})}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={booking.purpose}>
                    {booking.purpose}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      booking.status === 'approved' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                        : booking.status === 'pending' 
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' 
                          : booking.status === 'rejected' 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                    }`}>
                      {booking.status}
                    </span>
                    {booking.remarks && <div className="text-xs mt-1 text-gray-500 dark:text-gray-400 truncate w-32" title={booking.remarks}>{booking.remarks}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {['pending', 'approved'].includes(booking.status) && (
                      <button 
                        onClick={() => cancelBooking(booking._id)} 
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {myBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    You haven't made any resource bookings yet.
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

export default ResourceBooking;