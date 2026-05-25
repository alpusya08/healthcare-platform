package kz.healthcare.platform.auth.api.dto;

public record ChangePasswordRequest(String currentPassword, String newPassword) {}
