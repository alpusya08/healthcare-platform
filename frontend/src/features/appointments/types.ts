export interface Doctor {
  id: string;
  fullName: string;
  specialization: string;
  specializationCode: string;
  yearsExperience: number;
  bio: string | null;
  consultationFee: number | null;
  averageRating: number;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type AppointmentType = "ONLINE" | "OFFLINE";

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: AppointmentType;
  complaint: string | null;
}

export interface CreateAppointmentRequest {
  slotId: string;
  type: AppointmentType;
  complaint?: string;
  aiSessionId?: string;
}
