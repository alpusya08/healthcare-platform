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
  hasReview: boolean;
  meetingLink?: string;
}

export interface DoctorReview {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

export interface CreateAppointmentRequest {
  slotId: string;
  type: AppointmentType;
  complaint?: string;
  aiSessionId?: string;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface DoctorSearchParams {
  specialization?: string;
  minRating?: number;
  maxPrice?: number;
  minExperience?: number;
  query?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export interface UpcomingSlot {
  slotId: string;
  startTime: string;
  endTime: string;
  doctorId: string;
  doctorFullName: string;
  specialization: string;
  specializationCode: string;
  yearsExperience: number;
  consultationFee: number | null;
  averageRating: number;
}
