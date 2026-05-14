package kz.healthcare.platform.appointments.application.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record GenerateSlotsRequest(
        @NotNull @Min(1) @Max(12) Integer weeksAhead
) {}
