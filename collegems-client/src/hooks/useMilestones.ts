import { useQuery } from "@tanstack/react-query";
import { getMilestones } from "../api/milestoneApi";
import { MilestoneFilters, MilestoneResponse } from "../types/milestone";

export const useMilestones = (filters: MilestoneFilters) => {
  return useQuery<MilestoneResponse>({
    queryKey: ["milestones", filters],
    queryFn: () => getMilestones(filters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
