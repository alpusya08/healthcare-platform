import { useMutation } from "@tanstack/react-query";
import { authApi, type LoginPayload } from "./authApi";
import { useAuthStore } from "../model/authStore";
import { useNavigate } from "react-router-dom";
import { routes } from "@/shared/config/routes";
import { AxiosError } from "axios";
import type { ErrorResponse } from "@/shared/types/api";

export function useLoginMutation() {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setUser(data.user, data.accessToken, data.refreshToken);
      const home =
        data.user.role === "DOCTOR"
          ? routes.doctor.dashboard
          : data.user.role === "ADMIN"
            ? routes.admin.dashboard
            : routes.patient.home;
      navigate(home);
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      return error;
    },
  });
}
