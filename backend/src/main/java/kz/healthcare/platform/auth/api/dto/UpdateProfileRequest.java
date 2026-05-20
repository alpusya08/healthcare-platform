package kz.healthcare.platform.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateProfileRequest(
        @NotBlank @Size(min = 2, max = 100) String fullName,
        @Size(max = 20) String phone,
        LocalDate birthDate,
        String gender
) {}
