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

export type MlStats = {
  total_analyses: number;
  total_with_feedback: number;
  approved: number;
  rejected: number;
  partial: number;
  model_version: string;
  champion_confidence_avg: number;
};

export type RetrainResult = {
  status: string;
  message: string;
  new_f1: number | null;
  old_f1: number | null;
  deployed: boolean;
};

export type AdminFeedback = {
  id: string;
  doctorName: string;
  verdict: "APPROVED" | "REJECTED" | "PARTIAL";
  comment: string;
  correctedDiagnosis: string | null;
  createdAt: string;
};

export const adminApi = {
  getStats: () => apiClient.get<AdminStats>("/admin/stats").then((r) => r.data),
  listUsers: () => apiClient.get<AdminUser[]>("/admin/users").then((r) => r.data),
  setUserStatus: (userId: string, status: string) =>
    apiClient.patch<AdminUser>(`/admin/users/${userId}/status`, { status }).then((r) => r.data),
  getMlStats: () => apiClient.get<MlStats>("/admin/ml-stats").then((r) => r.data),
  triggerRetrain: () => apiClient.post<RetrainResult>("/admin/ml-retrain").then((r) => r.data),
  listFeedbacks: () => apiClient.get<AdminFeedback[]>("/admin/ai-feedbacks").then((r) => r.data),
};
