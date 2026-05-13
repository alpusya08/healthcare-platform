import { apiClient } from "@/shared/api/axios";
import type { AnalysisReport } from "@/features/analysis/types";

export type FeedbackVerdict = "APPROVED" | "REJECTED" | "PARTIAL";

export type DoctorAppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface DoctorAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  startTime: string;
  endTime: string;
  status: DoctorAppointmentStatus;
  type: "ONLINE" | "OFFLINE";
  complaint: string | null;
  aiSessionId: string | null;
  hasFeedback: boolean;
}

export interface DoctorProfile {
  id: string;
  fullName: string;
  email: string;
  specialization: string;
  specializationCode: string;
  yearsExperience: number;
  bio: string | null;
  consultationFee: number | null;
  averageRating: number;
  verified: boolean;
  licenseNumber: string;
}

export interface FeedbackRequest {
  verdict: FeedbackVerdict;
  comment: string;
}

export const doctorApi = {
  myAppointments: () =>
    apiClient.get<DoctorAppointment[]>("/doctor/appointments").then((r) => r.data),

  getProfile: () =>
    apiClient.get<DoctorProfile>("/doctor/profile").then((r) => r.data),

  submitFeedback: (appointmentId: string, request: FeedbackRequest) =>
    apiClient
      .post(`/doctor/appointments/${appointmentId}/feedback`, request)
      .then(() => undefined),

  getAiReport: (sessionId: string) =>
    apiClient
      .post<AnalysisReport>(`/ai/analysis/${sessionId}/finalize`)
      .then((r) => r.data),

  markCompleted: (appointmentId: string) =>
    apiClient
      .post(`/doctor/appointments/${appointmentId}/complete`)
      .then(() => undefined),

  markNoShow: (appointmentId: string) =>
    apiClient
      .post(`/doctor/appointments/${appointmentId}/no-show`)
      .then(() => undefined),
};
