import api from "./axios";
import { MilestoneFilters, MilestoneResponse } from "../types/milestone";

export const getMilestones = async (filters: MilestoneFilters): Promise<MilestoneResponse> => {
  const params = new URLSearchParams();
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.category) params.append("category", filters.category);
  if (filters.status) params.append("status", filters.status);
  if (filters.sort) params.append("sort", filters.sort);

  const res = await api.get<MilestoneResponse>(`/student/milestones?${params.toString()}`);
  return res.data;
};
