package kz.healthcare.platform.auth.api.dto;

import java.util.UUID;

public record UserInfoResponse(UUID id, String email, String fullName, String role, String phone) {}
