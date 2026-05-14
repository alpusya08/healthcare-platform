package kz.healthcare.platform.appointments.application.dto;

import java.util.UUID;

public record ScheduleTemplateResponse(
        UUID id,
        int dayOfWeek,
        int startHour,
        int startMin,
        int endHour,
        int endMin,
        int slotDurationMin,
        String appointmentType
) {}
