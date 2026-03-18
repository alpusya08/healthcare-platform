package kz.healthcare.platform.appointments.application.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record DoctorSummaryResponse(
        UUID id,
        String fullName,
        String specialization,
        String specializationCode,
        int yearsExperience,
        String bio,
        BigDecimal consultationFee,
        BigDecimal averageRating
) {}
