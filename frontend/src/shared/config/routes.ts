export const routes = {
  landing: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",

  patient: {
    home: "/dashboard",
    aiAnalysis: "/ai-analysis",
    aiAnalysisSession: "/ai-analysis/:sessionId",
    appointments: "/appointments",
    bookAppointment: "/book/:doctorId",
    doctors: "/doctors",
    doctorProfile: "/doctors/:doctorId",
    clinics: "/clinics",
    cabinet: "/cabinet",
    profile: "/profile",
    chat: "/chat/:appointmentId",
  },

  doctor: {
    dashboard: "/doctor",
    schedule: "/doctor/schedule",
    reviews: "/doctor/reviews",
    appointment: "/doctor/appointments/:id",
    aiReport: "/doctor/appointments/:id/ai-report",
    chat: "/doctor/chat/:appointmentId",
  },

  admin: {
    dashboard: "/admin",
    users: "/admin/users",
    specializations: "/admin/specializations",
    mlMonitoring: "/admin/ml",
    auditLog: "/admin/audit",
  },
} as const;
