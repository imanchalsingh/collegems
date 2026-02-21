import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Loader2,
  History,
  Clock,
  UserCheck,
  UserX,
  UserMinus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../api/axios";

interface AttendanceRecord {
  _id: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  markedAt: string;
}

export default function MyAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStatus, setSelectedStatus] = useState<"Present" | "Absent" | "Late" | "">("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    fetchMyAttendance();
    checkTodayAttendance();
  }, []);

  useEffect(() => {
    checkTodayAttendance();
  }, [selectedDate]);

  const fetchMyAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get("/teacher-attendance/my-attendance");
      setAttendanceHistory(res.data);
    } catch (err) {
      setError("Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const res = await api.get(`/teacher-attendance/my-attendance?date=${selectedDate}`);
      const todayRecord = res.data.find(
        (record: AttendanceRecord) => record.date.split("T")[0] === selectedDate
      );
      setTodayAttendance(todayRecord || null);
      if (todayRecord) {
        setSelectedStatus(todayRecord.status);
      } else {
        setSelectedStatus("");
      }
    } catch (err) {
      console.error("Error checking today's attendance:", err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError("Please select your attendance status");
      return;
    }

    try {
      setSaving(true);
      setError("");
      
      const res = await api.post("/teacher-attendance/mark", {
        date: selectedDate,
        status: selectedStatus,
      });

      setSuccess(res.data.message);
      await fetchMyAttendance();
      await checkTodayAttendance();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to mark attendance");
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Present":
        return <UserCheck className="w-4 h-4" />;
      case "Absent":
        return <UserX className="w-4 h-4" />;
      case "Late":
        return <UserMinus className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Absent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Late":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-emerald-100 text-emerald-700";
      case "Absent":
        return "bg-rose-100 text-rose-700";
      case "Late":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Calculate attendance stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthHistory = attendanceHistory.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
  });

  const monthlyStats = {
    present: monthHistory.filter(r => r.status === "Present").length,
    absent: monthHistory.filter(r => r.status === "Absent").length,
    late: monthHistory.filter(r => r.status === "Late").length,
    total: monthHistory.length,
  };

  return (
    <div className="space-y-6">
      {/* Today's Attendance Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Mark Today's Attendance
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendance Status
            </label>
            <div className="flex gap-2">
              {["Present", "Absent", "Late"].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status as any)}
                  disabled={!!todayAttendance}
                  className={`
                    flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    flex items-center justify-center gap-2
                    ${selectedStatus === status 
                      ? getStatusColor(status)
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                    ${todayAttendance ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  {getStatusIcon(status)}
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={saving || !selectedStatus || !!todayAttendance}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {todayAttendance ? "Already Marked" : "Save Attendance"}
                </>
              )}
            </button>
          </div>
        </div>

        {todayAttendance && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              You have already marked your attendance for {new Date(selectedDate).toLocaleDateString()} as {' '}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(todayAttendance.status)}`}>
                {todayAttendance.status}
              </span>
            </p>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-rose-50 rounded-lg">
            <p className="text-sm text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">This Month</p>
          <p className="text-2xl font-bold text-gray-900">{monthlyStats.total} days</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-sm text-emerald-600 mb-1">Present</p>
          <p className="text-2xl font-bold text-emerald-700">{monthlyStats.present}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-sm text-amber-600 mb-1">Late</p>
          <p className="text-2xl font-bold text-amber-700">{monthlyStats.late}</p>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
          <p className="text-sm text-rose-600 mb-1">Absent</p>
          <p className="text-2xl font-bold text-rose-700">{monthlyStats.absent}</p>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            Attendance History
          </h3>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading attendance history...</p>
          </div>
        ) : attendanceHistory.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No attendance records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">Marked At</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map((record) => (
                  <tr key={record._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-6 text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getStatusBadgeColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-500">
                      {new Date(record.markedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}