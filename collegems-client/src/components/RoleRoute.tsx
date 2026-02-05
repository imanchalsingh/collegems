import { Navigate } from "react-router-dom";

export default function RoleRoute({ role, children }: any) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" />;
  if (userRole !== role) return <Navigate to="/login" />;

  return children;
}
