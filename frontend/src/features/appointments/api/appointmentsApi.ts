import { apiClient } from "@/shared/api/axios";
import type {
  Appointment,
  CreateAppointmentRequest,
  CreateReviewRequest,
  Doctor,
  DoctorReview,
  DoctorSearchParams,
  SpringPage,
  TimeSlot,
  UpcomingSlot,
} from "../types";

export const appointmentsApi = {
  listDoctors: (specialization?: string) =>
    apiClient
      .get<Doctor[]>("/appointments/doctors", { params: { specialization } })
      .then((r) => r.data),

  searchDoctors: (params: DoctorSearchParams) =>
    apiClient
      .get<SpringPage<Doctor>>("/appointments/doctors/search", { params })
      .then((r) => r.data),

  listSlots: (doctorId: string) =>
    apiClient
      .get<TimeSlot[]>(`/appointments/doctors/${doctorId}/slots`)
      .then((r) => r.data),

  listUpcomingSlots: (specialization?: string, limit = 3) =>
    apiClient
      .get<UpcomingSlot[]>("/appointments/slots/upcoming", {
        params: { specialization, limit },
      })
      .then((r) => r.data),

  book: (request: CreateAppointmentRequest) =>
    apiClient
      .post<Appointment>("/appointments", request)
      .then((r) => r.data),

  myAppointments: () =>
    apiClient.get<Appointment[]>("/appointments").then((r) => r.data),

  cancel: (id: string) =>
    apiClient.delete(`/appointments/${id}`).then(() => undefined),

  submitReview: (appointmentId: string, payload: CreateReviewRequest) =>
    apiClient
      .post<DoctorReview>(`/appointments/${appointmentId}/review`, payload)
      .then((r) => r.data),

  doctorReviews: (doctorId: string) =>
    apiClient
      .get<DoctorReview[]>(`/appointments/doctors/${doctorId}/reviews`)
      .then((r) => r.data),
};
