package kz.healthcare.platform.admin.api.dto;

public record AdminStatsResponse(
        long totalUsers,
        long totalDoctors,
        long totalPatients,
        long totalAppointments,
        long scheduledAppointments,
        long completedAppointments
) {}
