package kz.healthcare.platform.appointments.application.dto;

import jakarta.validation.constraints.NotNull;
import kz.healthcare.platform.appointments.domain.AppointmentType;

import java.util.UUID;

public record CreateAppointmentRequest(
        @NotNull UUID slotId,
        @NotNull AppointmentType type,
        String complaint,
        UUID aiSessionId
) {}
