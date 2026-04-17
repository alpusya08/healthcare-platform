package kz.healthcare.platform.appointments.application.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record UpcomingSlotResponse(
        UUID slotId,
        Instant startTime,
        Instant endTime,
        UUID doctorId,
        String doctorFullName,
        String specialization,
        String specializationCode,
        int yearsExperience,
        BigDecimal consultationFee,
        BigDecimal averageRating
) {}
