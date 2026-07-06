import { useQuery } from "@tanstack/react-query";
import axios from "../api/axios";

export interface GradeTrendEntry {
  date: string; // ISO string
  course: string;
  internal: number;
  external: number;
  practical: number;
  total: number;
  grade: string;
}

interface Params {
  studentId: string;
  semester?: string;
  subject?: string; // courseId
}

export const useStudentGradeTrend = ({ studentId, semester, subject }: Params) => {
  return useQuery({
    queryKey: ["gradeTrend", studentId, semester, subject],
    queryFn: async (): Promise<GradeTrendEntry[]> => {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const query = new URLSearchParams();
      if (semester) query.append("semester", semester);
      if (subject) query.append("subject", subject);
      const url = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api"}/analytics/student/${studentId}/grade-trend?${query.toString()}`;
      const res = await axios.get(url, config);
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
