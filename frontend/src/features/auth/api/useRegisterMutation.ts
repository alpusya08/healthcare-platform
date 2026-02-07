import { useMutation } from "@tanstack/react-query";
import { authApi, type RegisterPatientPayload } from "./authApi";
import { useNavigate } from "react-router-dom";
import { routes } from "@/shared/config/routes";
import { AxiosError } from "axios";
import type { ErrorResponse } from "@/shared/types/api";

export function useRegisterMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPatientPayload) =>
      authApi.registerPatient(payload),
    onSuccess: () => {
      navigate(routes.login);
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      return error;
    },
  });
}
