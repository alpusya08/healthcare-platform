import { apiClient } from "@/shared/api/axios";

export type AdminStats = {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

export const adminApi = {
  getStats: () => apiClient.get<AdminStats>("/admin/stats").then((r) => r.data),
  listUsers: () => apiClient.get<AdminUser[]>("/admin/users").then((r) => r.data),
  setUserStatus: (userId: string, status: string) =>
    apiClient.patch<AdminUser>(`/admin/users/${userId}/status`, { status }).then((r) => r.data),
};
