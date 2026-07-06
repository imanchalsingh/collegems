import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { UserRole } from "../constants/role.constants";

interface WithRoleGuardOptions {
  allowedRoles: UserRole | UserRole[];
  redirectTo?: string;
}

const withRoleGuard = <P extends object>(
  Component: React.ComponentType<P>,
  options: WithRoleGuardOptions
) => {
  const Guarded: React.FC<P> = (props) => {
    const location = useLocation();
    
    // Instead of Redux, this app uses localStorage for auth state currently
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role") as UserRole;
    
    const { allowedRoles, redirectTo = "/access-denied" } = options;
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // If not logged in at all, redirect to login
    if (!token) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const isAuthorized = userRole && rolesArray.includes(userRole);

    if (!isAuthorized) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    return <Component {...props} />;
  };

  // Preserve display name for debugging in React DevTools
  const displayName = Component.displayName || Component.name || "Component";
  Guarded.displayName = `withRoleGuard(${displayName})`;

  return Guarded;
};

export default withRoleGuard;
