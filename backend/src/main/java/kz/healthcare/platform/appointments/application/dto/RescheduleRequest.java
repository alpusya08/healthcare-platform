package kz.healthcare.platform.appointments.application.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record RescheduleRequest(@NotNull UUID newSlotId) {}
