package kz.healthcare.platform.appointments.application.dto;

import kz.healthcare.platform.appointments.domain.AppointmentStatus;
import kz.healthcare.platform.appointments.domain.AppointmentType;

import java.time.Instant;
import java.util.UUID;

public record AppointmentResponse(
        UUID id,
        UUID doctorId,
        String doctorName,
        String specialization,
        Instant startTime,
        Instant endTime,
        AppointmentStatus status,
        AppointmentType type,
        String complaint
) {}
