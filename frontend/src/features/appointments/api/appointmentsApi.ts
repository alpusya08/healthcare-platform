import { apiClient } from "@/shared/api/axios";
import type { Appointment, CreateAppointmentRequest, Doctor, TimeSlot, UpcomingSlot } from "../types";

export const appointmentsApi = {
  listDoctors: (specialization?: string) =>
    apiClient
      .get<Doctor[]>("/appointments/doctors", { params: { specialization } })
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
};
