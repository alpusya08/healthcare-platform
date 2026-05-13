package kz.healthcare.platform.auth.application;

import kz.healthcare.platform.auth.api.dto.*;
import kz.healthcare.platform.auth.domain.PasswordResetToken;
import kz.healthcare.platform.auth.domain.RefreshToken;
import kz.healthcare.platform.auth.domain.exceptions.EmailAlreadyExistsException;
import kz.healthcare.platform.auth.domain.exceptions.InvalidCredentialsException;
import kz.healthcare.platform.auth.infrastructure.PasswordResetTokenRepository;
import kz.healthcare.platform.users.domain.*;
import kz.healthcare.platform.users.infrastructure.PatientRepository;
import kz.healthcare.platform.users.infrastructure.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    @Transactional
    public RegisterResponse registerPatient(RegisterPatientRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .role(Role.PATIENT)
                .build();
        userRepository.save(user);

        Patient patient = Patient.builder()
                .user(user)
                .birthDate(request.birthDate())
                .gender(request.gender())
                .phone(request.phone())
                .build();
        patientRepository.save(patient);

        log.info("Patient registered: {}", user.getEmail());
        return new RegisterResponse(user.getId(), user.getEmail(), user.getRole().name());
    }

    @Transactional
    public TokenResponse login(LoginRequest request, String userAgent, String ipAddress) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!user.isActive()) {
            throw new InvalidCredentialsException();
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        user.recordLogin();

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(user, userAgent, ipAddress);

        log.info("User logged in: {}", user.getEmail());
        return new TokenResponse(
                accessToken,
                refreshToken,
                jwtService.getAccessTokenTtlSeconds(),
                new TokenResponse.UserInfo(user.getId(), user.getEmail(), user.getFullName(), user.getRole().name())
        );
    }

    @Transactional
    public TokenResponse refresh(String rawRefreshToken, String userAgent, String ipAddress) {
        RefreshToken old = refreshTokenService.rotateRefreshToken(rawRefreshToken);
        User user = old.getUser();

        String accessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = refreshTokenService.createRefreshToken(user, userAgent, ipAddress);

        return new TokenResponse(
                accessToken,
                newRefreshToken,
                jwtService.getAccessTokenTtlSeconds(),
                new TokenResponse.UserInfo(user.getId(), user.getEmail(), user.getFullName(), user.getRole().name())
        );
    }

    @Transactional
    public void logout(UUID userId) {
        refreshTokenService.revokeAllUserTokens(userId);
        log.info("User logged out: {}", userId);
    }

    @Transactional(readOnly = true)
    public UserInfoResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(InvalidCredentialsException::new);
        String phone = patientRepository.findById(userId).map(Patient::getPhone).orElse(null);
        return new UserInfoResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole().name(), phone);
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            passwordResetTokenRepository.deleteAllByUserId(user.getId());

            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .token(rawToken)
                    .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                    .build();
            passwordResetTokenRepository.save(resetToken);

            log.info("password_reset.token_generated user={} token={}", email, rawToken);
        });
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(rawToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));

        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("Reset token has expired");
        }
        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("Reset token has already been used");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.markUsed();
        passwordResetTokenRepository.save(resetToken);

        refreshTokenService.revokeAllUserTokens(user.getId());
        log.info("password_reset.completed user={}", user.getEmail());
    }

    @Transactional
    public UserInfoResponse updateProfile(UUID userId, String fullName, String phone) {
        User user = userRepository.findById(userId)
                .orElseThrow(InvalidCredentialsException::new);
        user.setFullName(fullName);
        userRepository.save(user);

        patientRepository.findById(userId).ifPresent(patient -> {
            patient.setPhone(phone);
            patientRepository.save(patient);
        });

        log.info("Profile updated for user: {}", userId);
        return new UserInfoResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole().name(), phone);
    }
}
