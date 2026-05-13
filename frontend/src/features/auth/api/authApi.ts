import { apiClient } from "@/shared/api/axios";
import type { TokenResponse, RegisterResponse, UserInfo } from "@/shared/types/api";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPatientPayload = {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone?: string;
};

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<TokenResponse>("/auth/login", payload).then((r) => r.data),

  registerPatient: (payload: RegisterPatientPayload) =>
    apiClient
      .post<RegisterResponse>("/auth/register/patient", payload)
      .then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<TokenResponse>("/auth/refresh", { refreshToken })
      .then((r) => r.data),

  me: () => apiClient.get<UserInfo>("/auth/me").then((r) => r.data),

  updateProfile: (payload: { fullName: string; phone?: string }) =>
    apiClient.put<UserInfo>("/auth/me", payload).then((r) => r.data),

  logout: () => apiClient.post("/auth/logout"),
};
