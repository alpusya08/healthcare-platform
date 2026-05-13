import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/auth/model/authStore";
import { routes } from "@/shared/config/routes";
import type { UserInfo } from "@/shared/types/api";

type Props = {
  allowedRoles?: UserInfo["role"][];
};

function homeForRole(role: string): string {
  if (role === "DOCTOR") return routes.doctor.dashboard;
  if (role === "ADMIN") return routes.admin.dashboard;
  return routes.patient.home;
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}
