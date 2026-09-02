import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";
import type { UserRole } from "./types";

export function ProtectedRoute({
  children,
  roles,
}: PropsWithChildren<{ roles?: UserRole[] }>) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/forbidden" replace />;
  return children;
}
