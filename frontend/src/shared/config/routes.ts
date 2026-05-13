export const routes = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",

  patient: {
    home: "/",
    aiAnalysis: "/ai-analysis",
    aiAnalysisSession: "/ai-analysis/:sessionId",
    appointments: "/appointments",
    bookAppointment: "/book/:doctorId",
    doctors: "/doctors",
    doctorProfile: "/doctors/:doctorId",
    cabinet: "/cabinet",
    profile: "/profile",
  },

  doctor: {
    dashboard: "/doctor",
    schedule: "/doctor/schedule",
    appointment: "/doctor/appointments/:id",
    aiReport: "/doctor/appointments/:id/ai-report",
  },

  admin: {
    dashboard: "/admin",
    users: "/admin/users",
    specializations: "/admin/specializations",
    mlMonitoring: "/admin/ml",
    auditLog: "/admin/audit",
  },
} as const;
