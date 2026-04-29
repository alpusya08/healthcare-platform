import { apiClient } from "@/shared/api/axios";
import type { AnalysisReport } from "@/features/analysis/types";

export type FeedbackVerdict = "APPROVED" | "REJECTED" | "PARTIAL";

export interface DoctorAppointment {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  type: "ONLINE" | "OFFLINE";
  complaint: string | null;
  aiSessionId: string | null;
}

export interface FeedbackRequest {
  verdict: FeedbackVerdict;
  comment: string;
}

export const doctorApi = {
  myAppointments: () =>
    apiClient.get<DoctorAppointment[]>("/doctor/appointments").then((r) => r.data),

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
};
