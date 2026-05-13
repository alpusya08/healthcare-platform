package kz.healthcare.platform.admin.api.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String email,
        String fullName,
        String role,
        String status,
        Instant createdAt,
        Instant lastLoginAt
) {}
