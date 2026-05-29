package kz.healthcare.platform.auth.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.healthcare.platform.appointments.application.AppointmentService;
import kz.healthcare.platform.auth.application.AuthService;
import kz.healthcare.platform.auth.application.JwtService;
import kz.healthcare.platform.users.domain.Role;
import kz.healthcare.platform.users.domain.User;
import kz.healthcare.platform.users.domain.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies that the JWT security filter and SecurityConfig rules
 * correctly restrict access by role.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityEndpointTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @MockBean AppointmentService appointmentService;
    @MockBean AuthService authService;

    // ── helpers ───────────────────────────────────────────────────────────────

    private String tokenFor(Role role) {
        User user = User.builder()
                .email(role.name().toLowerCase() + "@medai.kz")
                .passwordHash("hash")
                .fullName("Test " + role.name())
                .role(role)
                .status(UserStatus.ACTIVE)
                .build();
        return "Bearer " + jwtService.generateAccessToken(user);
    }

    // ── public endpoints ──────────────────────────────────────────────────────

    @Test
    void health_isPublic_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk());
    }

    @Test
    void login_noAuth_isAllowed() throws Exception {
        when(authService.login(any(), any(), any()))
                .thenThrow(new kz.healthcare.platform.auth.domain.exceptions.InvalidCredentialsException());
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"x@x.com\",\"password\":\"bad\"}"))
                .andExpect(status().isUnauthorized());
    }

    // ── unauthenticated → 401 ─────────────────────────────────────────────────

    @Test
    void appointments_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/appointments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminUsers_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void doctorDashboard_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/doctor/appointments"))
                .andExpect(status().isUnauthorized());
    }

    // ── PATIENT cannot access ADMIN routes → 403 ─────────────────────────────

    @Test
    void adminEndpoint_patientToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", tokenFor(Role.PATIENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoint_doctorToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", tokenFor(Role.DOCTOR)))
                .andExpect(status().isForbidden());
    }

    // ── PATIENT cannot access DOCTOR routes → 403 ─────────────────────────────

    @Test
    void doctorEndpoint_patientToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/doctor/appointments")
                        .header("Authorization", tokenFor(Role.PATIENT)))
                .andExpect(status().isForbidden());
    }

    // ── PATIENT can access their own routes ───────────────────────────────────

    @Test
    void appointments_patientToken_returns200() throws Exception {
        when(appointmentService.listForPatient(any())).thenReturn(java.util.List.of());
        mockMvc.perform(get("/api/v1/appointments")
                        .header("Authorization", tokenFor(Role.PATIENT)))
                .andExpect(status().isOk());
    }

    @Test
    void doctors_patientToken_returns200() throws Exception {
        when(appointmentService.listDoctors(any())).thenReturn(java.util.List.of());
        mockMvc.perform(get("/api/v1/appointments/doctors")
                        .header("Authorization", tokenFor(Role.PATIENT)))
                .andExpect(status().isOk());
    }

    // ── ADMIN can access admin routes ─────────────────────────────────────────

    @Test
    void adminEndpoint_adminToken_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", tokenFor(Role.ADMIN)))
                .andExpect(status().isOk());
    }
}
