package kz.healthcare.platform.appointments.application.dto;

import kz.healthcare.platform.appointments.domain.AppointmentStatus;
import kz.healthcare.platform.appointments.domain.AppointmentType;
import kz.healthcare.platform.appointments.domain.PaymentStatus;

import java.math.BigDecimal;
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
        String complaint,
        boolean hasReview,
        String meetingLink,
        UUID aiSessionId,
        PaymentStatus paymentStatus,
        BigDecimal paymentAmount
) {}
