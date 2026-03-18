import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/shared/ui/sonner";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { AppLayout } from "@/app/router/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { AnalysisPage } from "@/pages/analysis/AnalysisPage";
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage";
import { DoctorsPage } from "@/pages/appointments/DoctorsPage";
import { BookAppointmentPage } from "@/pages/appointments/BookAppointmentPage";
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

              <Route element={<ProtectedRoute allowedRoles={["PATIENT"]} />}>
                <Route element={<AppLayout />}>
                  <Route path={routes.patient.home} element={<DashboardPage />} />
                  <Route path={routes.patient.aiAnalysis} element={<AnalysisPage />} />
                  <Route path={routes.patient.appointments} element={<AppointmentsPage />} />
                  <Route path={routes.patient.doctors} element={<DoctorsPage />} />
                  <Route path={routes.patient.bookAppointment} element={<BookAppointmentPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
