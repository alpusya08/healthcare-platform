package kz.healthcare.platform.appointments.application.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ScheduleTemplateEntry(
        @NotNull @Min(1) @Max(7) Integer dayOfWeek,
        @NotNull @Min(0) @Max(23) Integer startHour,
        @Min(0) @Max(59) int startMin,
        @NotNull @Min(0) @Max(23) Integer endHour,
        @Min(0) @Max(59) int endMin,
        @NotNull @Min(15) @Max(120) Integer slotDurationMin,
        @NotNull String appointmentType
) {}
