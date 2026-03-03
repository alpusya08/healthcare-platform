package kz.healthcare.platform.auth.application;

import kz.healthcare.platform.users.domain.Role;
import kz.healthcare.platform.users.domain.User;
import kz.healthcare.platform.users.domain.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "test-secret-key-that-is-long-enough-for-hs512-algorithm-needs-64-bytes";
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, Duration.ofMinutes(15));
    }

    private User buildUser(Role role) {
        return User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .passwordHash("hash")
                .fullName("Test User")
                .role(role)
                .build();
    }

    @Test
    void generateAccessToken_returnsNonBlankToken() {
        User user = buildUser(Role.PATIENT);
        String token = jwtService.generateAccessToken(user);
        assertThat(token).isNotBlank();
    }

    @Test
    void isValid_validToken_returnsTrue() {
        User user = buildUser(Role.PATIENT);
        String token = jwtService.generateAccessToken(user);
        assertThat(jwtService.isValid(token)).isTrue();
    }

    @Test
    void isValid_tamperedToken_returnsFalse() {
        assertThat(jwtService.isValid("not.a.jwt")).isFalse();
    }

    @Test
    void extractUserId_matchesUserIdInToken() {
        User user = buildUser(Role.PATIENT);
        String token = jwtService.generateAccessToken(user);
        UUID extracted = jwtService.extractUserId(token);
        assertThat(extracted).isEqualTo(user.getId());
    }

    @Test
    void extractRole_matchesUserRole() {
        User user = buildUser(Role.DOCTOR);
        String token = jwtService.generateAccessToken(user);
        assertThat(jwtService.extractRole(token)).isEqualTo("DOCTOR");
    }

    @Test
    void isValid_expiredToken_returnsFalse() {
        JwtService shortLived = new JwtService(SECRET, Duration.ofNanos(1));
        User user = buildUser(Role.PATIENT);
        String token = shortLived.generateAccessToken(user);
        assertThat(shortLived.isValid(token)).isFalse();
    }

    @Test
    void getAccessTokenTtlSeconds_returnsConfiguredValue() {
        assertThat(jwtService.getAccessTokenTtlSeconds()).isEqualTo(900L);
    }
}
