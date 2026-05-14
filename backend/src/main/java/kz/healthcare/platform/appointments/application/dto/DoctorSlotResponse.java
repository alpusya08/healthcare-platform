package kz.healthcare.platform.appointments.application.dto;

import java.time.Instant;
import java.util.UUID;

public record DoctorSlotResponse(
        UUID id,
        Instant startTime,
        Instant endTime,
        boolean booked,
        boolean blocked,
        String appointmentType
) {}
