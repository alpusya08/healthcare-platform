import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/auth/model/authStore";
import { routes } from "@/shared/config/routes";
import type { UserInfo } from "@/shared/types/api";

type Props = {
  allowedRoles?: UserInfo["role"][];
};

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
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
