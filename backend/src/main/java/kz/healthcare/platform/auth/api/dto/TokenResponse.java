package kz.healthcare.platform.auth.api.dto;

import java.util.UUID;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserInfo user
) {
    public record UserInfo(UUID id, String email, String fullName, String role) {}
}
