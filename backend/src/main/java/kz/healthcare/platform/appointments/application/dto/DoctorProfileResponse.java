package kz.healthcare.platform.appointments.application.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record DoctorProfileResponse(
        UUID id,
        String fullName,
        String email,
        String specialization,
        String specializationCode,
        int yearsExperience,
        String bio,
        BigDecimal consultationFee,
        BigDecimal averageRating,
        boolean verified,
        String licenseNumber
) {}
