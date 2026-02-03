package kz.healthcare.platform.auth.api.dto;

import java.util.UUID;

public record RegisterResponse(UUID userId, String email, String role) {}
