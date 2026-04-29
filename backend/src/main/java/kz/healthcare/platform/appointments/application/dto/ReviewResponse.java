package kz.healthcare.platform.appointments.application.dto;

import java.time.Instant;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID doctorId,
        UUID patientId,
        String patientName,
        int rating,
        String comment,
        Instant createdAt
) {}
