package kz.healthcare.platform.auth.application;

import kz.healthcare.platform.auth.api.dto.*;
import kz.healthcare.platform.auth.domain.RefreshToken;
import kz.healthcare.platform.auth.domain.exceptions.EmailAlreadyExistsException;
import kz.healthcare.platform.auth.domain.exceptions.InvalidCredentialsException;
import kz.healthcare.platform.users.domain.Role;
import kz.healthcare.platform.users.domain.User;
import kz.healthcare.platform.users.domain.UserStatus;
import kz.healthcare.platform.users.infrastructure.PatientRepository;
import kz.healthcare.platform.users.infrastructure.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthService authService;

    private User activePatient() {
        return User.builder()
                .email("user@test.com")
                .passwordHash("$2a$hash")
                .fullName("Test Patient")
                .role(Role.PATIENT)
                .build();
    }

    // ── register ──────────────────────────────────────────────────────────────

    @Test
    void registerPatient_newEmail_createsUserAndPatient() {
        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(patientRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");

        var request = new RegisterPatientRequest(
                "new@test.com", "Password1!", "New Patient",
                LocalDate.of(1990, 1, 1), kz.healthcare.platform.users.domain.Gender.MALE, null
        );

        RegisterResponse response = authService.registerPatient(request);

        assertThat(response.email()).isEqualTo("new@test.com");
        assertThat(response.role()).isEqualTo("PATIENT");
        verify(userRepository).save(any());
        verify(patientRepository).save(any());
    }

    @Test
    void registerPatient_duplicateEmail_throwsEmailAlreadyExists() {
        when(userRepository.existsByEmail("dup@test.com")).thenReturn(true);

        var request = new RegisterPatientRequest(
                "dup@test.com", "Password1!", "Dup",
                LocalDate.of(1990, 1, 1), kz.healthcare.platform.users.domain.Gender.MALE, null
        );

        assertThatThrownBy(() -> authService.registerPatient(request))
                .isInstanceOf(EmailAlreadyExistsException.class);
        verify(userRepository, never()).save(any());
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returnsTokenResponse() {
        User user = activePatient();
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password", user.getPasswordHash())).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("access.token");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
        when(refreshTokenService.createRefreshToken(any(), any(), any())).thenReturn("refresh-token");

        TokenResponse response = authService.login(
                new LoginRequest("user@test.com", "password"), "agent", "127.0.0.1"
        );

        assertThat(response.accessToken()).isEqualTo("access.token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.user().email()).isEqualTo("user@test.com");
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentials() {
        User user = activePatient();
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("user@test.com", "wrong"), "agent", "127.0.0.1"
        )).isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_unknownEmail_throwsInvalidCredentials() {
        when(userRepository.findByEmail("nobody@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("nobody@test.com", "pass"), "agent", "127.0.0.1"
        )).isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_suspendedUser_throwsInvalidCredentials() {
        User suspended = User.builder()
                .email("user@test.com")
                .passwordHash("hash")
                .fullName("Suspended")
                .role(Role.PATIENT)
                .status(UserStatus.SUSPENDED)
                .build();
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(suspended));

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("user@test.com", "pass"), "agent", "127.0.0.1"
        )).isInstanceOf(InvalidCredentialsException.class);
    }

    // ── refresh ───────────────────────────────────────────────────────────────

    @Test
    void refresh_validToken_returnsNewTokenPair() {
        User user = activePatient();
        RefreshToken old = RefreshToken.builder()
                .user(user)
                .tokenHash("hash")
                .expiresAt(java.time.Instant.now().plusSeconds(3600))
                .build();

        when(refreshTokenService.rotateRefreshToken("raw-token")).thenReturn(old);
        when(jwtService.generateAccessToken(user)).thenReturn("new.access");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
        when(refreshTokenService.createRefreshToken(any(), any(), any())).thenReturn("new-refresh");

        TokenResponse response = authService.refresh("raw-token", "agent", "127.0.0.1");

        assertThat(response.accessToken()).isEqualTo("new.access");
        assertThat(response.refreshToken()).isEqualTo("new-refresh");
    }

    // ── logout ────────────────────────────────────────────────────────────────

    @Test
    void logout_revokesAllUserTokens() {
        UUID userId = UUID.randomUUID();
        authService.logout(userId);
        verify(refreshTokenService).revokeAllUserTokens(userId);
    }

    // ── getCurrentUser ────────────────────────────────────────────────────────

    @Test
    void getCurrentUser_existingUser_returnsInfo() {
        User user = activePatient();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        UserInfoResponse info = authService.getCurrentUser(user.getId());

        assertThat(info.email()).isEqualTo("user@test.com");
        assertThat(info.fullName()).isEqualTo("Test Patient");
        assertThat(info.role()).isEqualTo("PATIENT");
    }

    @Test
    void getCurrentUser_unknownId_throwsInvalidCredentials() {
        UUID unknown = UUID.randomUUID();
        when(userRepository.findById(unknown)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentUser(unknown))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
