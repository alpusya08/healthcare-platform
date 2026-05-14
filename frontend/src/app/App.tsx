import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/shared/ui/sonner";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { AppLayout } from "@/app/router/AppLayout";
import { DoctorLayout } from "@/app/router/DoctorLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { AnalysisPage } from "@/pages/analysis/AnalysisPage";
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage";
import { DoctorsPage } from "@/pages/appointments/DoctorsPage";
import { DoctorProfilePage } from "@/pages/appointments/DoctorProfilePage";
import { BookAppointmentPage } from "@/pages/appointments/BookAppointmentPage";
import { PatientCabinetPage } from "@/pages/cabinet/PatientCabinetPage";
import { DoctorDashboard } from "@/pages/doctor/DoctorDashboard";
import { DoctorProfilePage as DoctorOwnProfilePage } from "@/pages/doctor/DoctorProfilePage";
import { DoctorSchedulePage } from "@/pages/doctor/DoctorSchedulePage";
import { AdminLayout } from "@/app/router/AdminLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminMLDashboardPage } from "@/pages/admin/AdminMLDashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { routes } from "@/shared/config/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path={routes.login} element={<LoginPage />} />
              <Route path={routes.register} element={<RegisterPage />} />
              <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />
              <Route path={routes.resetPassword} element={<ResetPasswordPage />} />

              <Route element={<ProtectedRoute allowedRoles={["PATIENT"]} />}>
                <Route element={<AppLayout />}>
                  <Route path={routes.patient.home} element={<DashboardPage />} />
                  <Route path={routes.patient.aiAnalysis} element={<AnalysisPage />} />
                  <Route path={routes.patient.appointments} element={<AppointmentsPage />} />
                  <Route path={routes.patient.doctors} element={<DoctorsPage />} />
                  <Route path={routes.patient.doctorProfile} element={<DoctorProfilePage />} />
                  <Route path={routes.patient.bookAppointment} element={<BookAppointmentPage />} />
                  <Route path={routes.patient.cabinet} element={<PatientCabinetPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["DOCTOR"]} />}>
                <Route element={<DoctorLayout />}>
                  <Route path={routes.doctor.dashboard} element={<DoctorDashboard />} />
                  <Route path="/doctor/profile" element={<DoctorOwnProfilePage />} />
                  <Route path={routes.doctor.schedule} element={<DoctorSchedulePage />} />
                  <Route path="/doctor/ai-reports" element={<DoctorDashboard />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                <Route element={<AdminLayout />}>
                  <Route path={routes.admin.dashboard} element={<AdminDashboardPage />} />
                  <Route path={routes.admin.users} element={<AdminUsersPage />} />
                  <Route path={routes.admin.mlMonitoring} element={<AdminMLDashboardPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster position="bottom-right" richColors duration={4000} toastOptions={{ className: "z-[9999]" }} />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
