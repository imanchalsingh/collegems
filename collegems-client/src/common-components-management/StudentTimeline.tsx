import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { History, ArrowRight } from "lucide-react";

interface TimelineEvent {
  _id: string;
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  timestamp: string;
}

interface StudentTimelineProps {
  studentId: string;
}

export default function StudentTimeline({ studentId }: StudentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (studentId) {
      fetchTimeline();
    }
  }, [studentId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/students/${studentId}/timeline`);
      setEvents(res.data.data || []);
    } catch (err: any) {
      console.error("Failed to fetch timeline", err);
      setError("Failed to load timeline history.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="py-4 text-center text-sm text-gray-500">Loading timeline...</div>;
  if (error) return <div className="py-4 text-center text-sm text-red-500">{error}</div>;

  if (events.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center">
        <History className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No historical changes recorded for this student.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
        <History className="w-4 h-4 text-gray-500" />
        Record History
      </h4>
      <div className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
        {events.map((event) => (
          <div key={event._id} className="relative pl-6">
            <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white dark:ring-gray-800" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {new Date(event.timestamp).toLocaleString()}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                <span className="capitalize">{event.field}</span> changed
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span className="line-through opacity-70">{event.oldValue || 'None'}</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="font-medium text-blue-600 dark:text-blue-400">{event.newValue || 'None'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
