import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then((user) => {
        const accessToken = localStorage.getItem("accessToken")!;
        const refreshToken = localStorage.getItem("refreshToken")!;
        setUser(user, accessToken, refreshToken);
      })
      .catch(() => {
        clearAuth();
      });
  }, []);

  return <>{children}</>;
}
