import React, { useEffect, useState } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  Armchair,
  BookOpen,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import api from "../api/axios";

interface MySeatData {
  examName: string;
  course: string;
  examDate: string;
  startTime: string;
  endTime: string;
  hallName: string;
  seatNumber: string;
  building?: string;
  strategy: string;
}

const StudentSeatView: React.FC = () => {
  const [seatData, setSeatData] = useState<MySeatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noAllocation, setNoAllocation] = useState(false);

  useEffect(() => {
    fetchMySeat();
  }, []);

  const fetchMySeat = async () => {
    try {
      setLoading(true);
      setError("");
      setNoAllocation(false);

      const res = await api.get("/hall-allocations/student/my-seat");

      if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
        setNoAllocation(true);
      } else {
        // API returns an array of seat assignments; map the first one to MySeatData
        const raw = Array.isArray(res.data) ? res.data[0] : res.data;
        const exam = raw.examSchedule || {};
        setSeatData({
          examName: exam.examName || "",
          course: exam.course || "",
          examDate: exam.examDate || "",
          startTime: exam.startTime || "",
          endTime: exam.endTime || "",
          hallName: raw.hallName || "",
          seatNumber: raw.seatNumber || "",
          building: raw.building || "",
          strategy: raw.strategy || "",
        });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setNoAllocation(true);
      } else {
        console.error("Error fetching seat data:", err);
        setError(err.response?.data?.message || "Failed to load seat allocation.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Loading your seat allocation...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
        <div className="text-center">
          <button
            onClick={fetchMySeat}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (noAllocation) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Armchair className="w-10 h-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          No Seat Assigned Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
          No seat has been assigned yet. Your allocation will appear here once published.
        </p>
        <button
          onClick={fetchMySeat}
          className="mt-6 px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Check Again
        </button>
      </div>
    );
  }

  if (!seatData) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Main Seat Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md">
        {/* Header gradient bar */}
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />

        <div className="p-6 space-y-6">
          {/* Exam Info */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {seatData.examName}
            </h2>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {seatData.course}
              </span>
            </div>
          </div>

          {/* Seat Number Display */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <div className="text-center">
                  <p className="text-3xl font-black text-white">{seatData.seatNumber}</p>
                  <p className="text-[10px] text-blue-100 uppercase tracking-widest font-semibold mt-0.5">
                    Seat
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-3">
            {/* Date */}
            <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  Date
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(seatData.examDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  Time
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {seatData.startTime} – {seatData.endTime}
                </p>
              </div>
            </div>

            {/* Hall & Building */}
            <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  Location
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {seatData.hallName}
                  {seatData.building && (
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      {" "}
                      • {seatData.building}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Seat */}
            <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
                <Armchair className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  Seat Number
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {seatData.seatNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Strategy tag */}
          <div className="text-center pt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Allocation: {seatData.strategy.replace("-", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={fetchMySeat}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default StudentSeatView;
