package kz.healthcare.platform.auth.application;

import kz.healthcare.platform.auth.domain.RefreshToken;
import kz.healthcare.platform.auth.domain.exceptions.TokenExpiredException;
import kz.healthcare.platform.auth.infrastructure.RefreshTokenRepository;
import kz.healthcare.platform.users.domain.Role;
import kz.healthcare.platform.users.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refreshTokenService, "refreshTokenTtl", Duration.ofDays(30));
    }

    private User buildPatient() {
        return User.builder()
                .email("p@test.com")
                .passwordHash("hash")
                .fullName("Patient One")
                .role(Role.PATIENT)
                .build();
    }

    @Test
    void createRefreshToken_savesAndReturnsRawToken() {
        User user = buildPatient();
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String raw = refreshTokenService.createRefreshToken(user, "agent", "127.0.0.1");

        assertThat(raw).isNotBlank();
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        String storedHash = RefreshTokenService.hashToken(raw);
        assertThat(captor.getValue().getTokenHash()).isEqualTo(storedHash);
    }

    @Test
    void rotateRefreshToken_validToken_revokesAndReturns() {
        User user = buildPatient();
        String rawToken = UUID.randomUUID().toString();
        String hash = RefreshTokenService.hashToken(rawToken);

        RefreshToken existing = RefreshToken.builder()
                .user(user)
                .tokenHash(hash)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(refreshTokenRepository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.of(existing));

        RefreshToken result = refreshTokenService.rotateRefreshToken(rawToken);

        assertThat(result).isSameAs(existing);
        assertThat(existing.isRevoked()).isTrue();
    }

    @Test
    void rotateRefreshToken_expiredToken_throwsTokenExpiredException() {
        String rawToken = UUID.randomUUID().toString();
        String hash = RefreshTokenService.hashToken(rawToken);

        RefreshToken expired = RefreshToken.builder()
                .tokenHash(hash)
                .expiresAt(Instant.now().minusSeconds(1))
                .user(buildPatient())
                .build();

        when(refreshTokenRepository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> refreshTokenService.rotateRefreshToken(rawToken))
                .isInstanceOf(TokenExpiredException.class);
    }

    @Test
    void rotateRefreshToken_unknownToken_throwsTokenExpiredException() {
        String rawToken = UUID.randomUUID().toString();
        String hash = RefreshTokenService.hashToken(rawToken);
        when(refreshTokenRepository.findByTokenHashAndRevokedFalse(hash)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> refreshTokenService.rotateRefreshToken(rawToken))
                .isInstanceOf(TokenExpiredException.class);
    }

    @Test
    void revokeAllUserTokens_delegatesToRepository() {
        UUID userId = UUID.randomUUID();
        refreshTokenService.revokeAllUserTokens(userId);
        verify(refreshTokenRepository).revokeAllByUserId(userId);
    }

    @Test
    void hashToken_deterministicAndNotBlank() {
        String raw = "some-token";
        String h1 = RefreshTokenService.hashToken(raw);
        String h2 = RefreshTokenService.hashToken(raw);
        assertThat(h1).isEqualTo(h2).isNotBlank().isNotEqualTo(raw);
    }
}
