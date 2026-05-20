package kz.healthcare.platform.auth.api.dto;

import java.time.LocalDate;
import java.util.UUID;

public record UserInfoResponse(
        UUID id,
        String email,
        String fullName,
        String role,
        String phone,
        LocalDate birthDate,
        String gender
) {}
