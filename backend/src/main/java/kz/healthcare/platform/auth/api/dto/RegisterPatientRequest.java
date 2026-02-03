package kz.healthcare.platform.auth.api.dto;

import jakarta.validation.constraints.*;
import kz.healthcare.platform.users.domain.Gender;

import java.time.LocalDate;

public record RegisterPatientRequest(
        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 8, max = 128)
        @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).*$",
                message = "Пароль должен содержать заглавную букву, цифру и спецсимвол")
        String password,

        @NotBlank @Size(max = 255)
        String fullName,

        @NotNull @Past
        LocalDate birthDate,

        @NotNull
        Gender gender,

        @Size(max = 32)
        String phone
) {}
