import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Assuming Redux is handling authentication and the token is automatically attached to axios via interceptors,
// otherwise we would need to pass it or use a custom axios instance from the project.
// In this repo, 'VITE_BACKEND_URL' is used and token is usually in localStorage or handled.
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

export interface ActivityItem {
  id: string;
  type: "Complaint" | "Assignment" | "Event";
  title: string;
  description: string;
  date: string;
}

export interface HodDashboardMetrics {
  totalEnrollment: number;
  totalCourses: number;
  activeFaculty: number;
  averageAttendance: number;
  recentActivity: ActivityItem[];
}

export const useHodAnalytics = () => {
  return useQuery({
    queryKey: ["hodDashboardMetrics"],
    queryFn: async (): Promise<HodDashboardMetrics> => {
      // Create axios config if token is in local storage (common pattern)
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      
      const response = await axios.get(`${backendUrl}/analytics/department/hod-dashboard`, config);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // Data remains fresh for 5 minutes
    retry: 1,
  });
};
