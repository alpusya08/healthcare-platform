package kz.healthcare.platform.appointments.application.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SaveTemplateRequest(
        @NotNull @Valid List<ScheduleTemplateEntry> entries
) {}
