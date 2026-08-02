import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import AcademicTimeline from "../pages/student/AcademicTimeline";
import * as useMilestonesModule from "../hooks/useMilestones";

// Mock the react query hook
vi.mock("../hooks/useMilestones", () => ({
  useMilestones: vi.fn(),
}));

const mockMilestones = [
  {
    id: "1",
    title: "Registered as Student",
    category: "Registration",
    status: "Completed",
    date: "2026-08-01T09:00:00.000Z",
    description: "Registered for course Computer Science.",
    redirectUrl: "/student/profile",
    icon: "Registration",
    color: "green",
  },
  {
    id: "2",
    title: "C++ Basics Assignment",
    category: "Assignment",
    status: "Upcoming",
    date: "2026-08-10T23:59:59.000Z",
    description: "Submit basic structures homework.",
    redirectUrl: "/student/assignments",
    icon: "Assignment",
    color: "blue",
  },
  {
    id: "3",
    title: "Library Fine Overdue",
    category: "Fees",
    status: "Missed",
    date: "2026-07-25T18:00:00.000Z",
    description: "Outstanding library fine of $5.",
    redirectUrl: "/student/fees",
    icon: "Fee",
    color: "red",
  },
];

describe("AcademicTimeline Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AcademicTimeline />
      </MemoryRouter>
    );
  };

  it("renders the loading skeleton first", () => {
    vi.mocked(useMilestonesModule.useMilestones).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    // Verify loading skeletons are rendered
    expect(screen.queryByText("Academic Milestones")).toBeTruthy();
    expect(screen.queryByText("Registered as Student")).toBeNull();
  });

  it("renders error state with retry button", () => {
    const mockRefetch = vi.fn();
    vi.mocked(useMilestonesModule.useMilestones).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as any);

    renderComponent();

    expect(screen.getByText("Failed to load timeline")).toBeTruthy();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeTruthy();

    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders milestones list and summary statistics", () => {
    vi.mocked(useMilestonesModule.useMilestones).mockReturnValue({
      data: {
        success: true,
        milestones: mockMilestones,
        pagination: {
          page: 1,
          totalPages: 1,
          totalRecords: 3,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    // Verify stats
    expect(screen.getByText("Total Milestones")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();

    // Verify milestone cards are rendered
    expect(screen.getByText("Registered as Student")).toBeTruthy();
    expect(screen.getByText("C++ Basics Assignment")).toBeTruthy();
    expect(screen.getByText("Library Fine Overdue")).toBeTruthy();
  });

  it("filters milestones locally based on search text", async () => {
    vi.mocked(useMilestonesModule.useMilestones).mockReturnValue({
      data: {
        success: true,
        milestones: mockMilestones,
        pagination: {
          page: 1,
          totalPages: 1,
          totalRecords: 3,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    // Search for "Basics"
    const searchInput = screen.getByPlaceholderText("Search events...");
    fireEvent.change(searchInput, { target: { value: "Basics" } });

    // Wait for debounce simulation (300ms)
    await waitFor(() => {
      expect(screen.queryByText("Registered as Student")).toBeNull();
      expect(screen.getByText("C++ Basics Assignment")).toBeTruthy();
    });
  });

  it("renders empty state when list is empty", () => {
    vi.mocked(useMilestonesModule.useMilestones).mockReturnValue({
      data: {
        success: true,
        milestones: [],
        pagination: {
          page: 1,
          totalPages: 1,
          totalRecords: 0,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    expect(screen.getByText("No Milestones Found")).toBeTruthy();
  });
});
