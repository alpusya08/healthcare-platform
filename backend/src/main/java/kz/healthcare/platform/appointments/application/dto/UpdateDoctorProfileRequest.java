package kz.healthcare.platform.appointments.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateDoctorProfileRequest(
        @Size(max = 1000) String bio,
        @DecimalMin("0") BigDecimal consultationFee
) {}
