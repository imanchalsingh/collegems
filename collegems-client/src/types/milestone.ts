export type MilestoneCategory =
  | "Admission"
  | "Registration"
  | "Semester"
  | "Attendance"
  | "Assignment"
  | "Exam"
  | "Result"
  | "Fees"
  | "Leave"
  | "Certificate"
  | "Achievement"
  | "Graduation";

export type MilestoneStatus = "Completed" | "Upcoming" | "Missed";

export interface Milestone {
  id: string;
  title: string;
  category: MilestoneCategory;
  status: MilestoneStatus;
  date: string; // ISO string representation
  description: string;
  redirectUrl: string;
  icon: string;
  color: string;
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  totalRecords: number;
}

export interface MilestoneResponse {
  success: boolean;
  milestones: Milestone[];
  pagination: PaginationInfo;
}

export interface MilestoneFilters {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  sort?: "asc" | "desc";
  search?: string;
}
