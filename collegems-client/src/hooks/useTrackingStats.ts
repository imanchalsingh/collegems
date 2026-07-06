import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";

export interface TrackedEntity {
  _id: string;
  entityId: string;
  count: number;
  entity: {
    _id: string;
    name?: string;
    email?: string;
    studentId?: string;
    code?: string;
    department?: string;
  } | null;
}

export interface TrackingStats {
  students: TrackedEntity[];
  courses: TrackedEntity[];
  departments: TrackedEntity[];
}

export function useTrackingStats(type?: string) {
  const [data, setData] = useState<TrackingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = type ? `?type=${type}&limit=10` : "?limit=10";
      const res = await api.get(`/tracking/stats${params}`);
      console.log("[TrackingWidget] Stats response:", res.data);
      setData(res.data.data);
      setError(null);
    } catch (err) {
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message
        : "Failed to load tracking stats";
      setError(message || "Failed to load tracking stats");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, loading, error, refetch: fetchStats };
}
