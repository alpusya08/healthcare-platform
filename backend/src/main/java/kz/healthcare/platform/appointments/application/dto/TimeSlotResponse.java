package kz.healthcare.platform.appointments.application.dto;

import java.time.Instant;
import java.util.UUID;

public record TimeSlotResponse(
        UUID id,
        Instant startTime,
        Instant endTime
) {}
