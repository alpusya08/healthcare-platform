package kz.healthcare.platform.auth.application;

import kz.healthcare.platform.auth.api.dto.*;
import kz.healthcare.platform.auth.domain.RefreshToken;
import kz.healthcare.platform.auth.domain.exceptions.EmailAlreadyExistsException;
import kz.healthcare.platform.auth.domain.exceptions.InvalidCredentialsException;
import kz.healthcare.platform.users.domain.*;
import kz.healthcare.platform.users.infrastructure.PatientRepository;
import kz.healthcare.platform.users.infrastructure.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        return new UserInfoResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole().name());
    }
}
