package kz.healthcare.platform.appointments.application.dto;

import kz.healthcare.platform.appointments.domain.AppointmentStatus;
import kz.healthcare.platform.appointments.domain.AppointmentType;

import java.time.Instant;
import java.util.UUID;

public record DoctorAppointmentResponse(
        UUID id,
        UUID patientId,
        String patientName,
        String patientPhone,
        Instant startTime,
        Instant endTime,
        AppointmentStatus status,
        AppointmentType type,
        String complaint,
        UUID aiSessionId,
        boolean hasFeedback,
        String meetingLink
) {}
