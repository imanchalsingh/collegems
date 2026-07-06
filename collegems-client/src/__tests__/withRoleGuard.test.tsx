import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import withRoleGuard from "../hocs/withRoleGuard";
import { UserRole } from "../constants/role.constants";

// Mock component to test with
const MockComponent = () => <div data-testid="protected-content">Protected Content</div>;

// Component to verify redirection targets and state
const RedirectTarget = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="redirected">Redirected</div>
      <div data-testid="state-from">{location.state?.from?.pathname || "none"}</div>
    </div>
  );
};

describe("withRoleGuard HOC", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      clear: () => {
        for (const key in store) delete store[key];
      }
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    });
    localStorage.clear();
  });

  const renderWithRouter = (GuardedComponent: React.ComponentType) => {
    return render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/protected" element={<GuardedComponent />} />
          <Route path="/login" element={<RedirectTarget />} />
          <Route path="/access-denied" element={<RedirectTarget />} />
          <Route path="/custom-redirect" element={<RedirectTarget />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("should redirect to /login when token is missing", () => {
    // Both missing
    const Guarded = withRoleGuard(MockComponent, { allowedRoles: UserRole.STUDENT });
    renderWithRouter(Guarded);

    // It should redirect to login since token is missing
    expect(screen.getByTestId("redirected")).toBeTruthy();
    expect(screen.getByTestId("state-from").textContent).toBe("/protected");
  });

  it("should render component when user has single allowed role", () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("role", UserRole.TEACHER);

    const Guarded = withRoleGuard(MockComponent, { allowedRoles: UserRole.TEACHER });
    renderWithRouter(Guarded);

    expect(screen.queryByTestId("redirected")).toBeNull();
    expect(screen.getByTestId("protected-content")).toBeTruthy();
  });

  it("should render component when user role is within allowed array", () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("role", UserRole.HOD);

    const Guarded = withRoleGuard(MockComponent, { allowedRoles: [UserRole.TEACHER, UserRole.HOD] });
    renderWithRouter(Guarded);

    expect(screen.queryByTestId("redirected")).toBeNull();
    expect(screen.getByTestId("protected-content")).toBeTruthy();
  });

  it("should redirect to /access-denied (default) when user role is not allowed", () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("role", UserRole.STUDENT);

    const Guarded = withRoleGuard(MockComponent, { allowedRoles: [UserRole.TEACHER, UserRole.HOD] });
    renderWithRouter(Guarded);

    // Should redirect to default /access-denied
    expect(screen.getByTestId("redirected")).toBeTruthy();
  });

  it("should redirect to custom path when provided and user is not allowed", () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("role", UserRole.PARENT);

    const Guarded = withRoleGuard(MockComponent, { 
      allowedRoles: UserRole.STUDENT, 
      redirectTo: "/custom-redirect" 
    });
    renderWithRouter(Guarded);

    expect(screen.getByTestId("redirected")).toBeTruthy();
  });
});
