package kz.healthcare.platform.appointments.application.dto;

import java.math.BigDecimal;

public record DoctorFilterRequest(
        String specialization,
        BigDecimal minRating,
        BigDecimal maxPrice,
        Integer minExperience,
        String query,
        String sort,
        int page,
        int size
) {
    public DoctorFilterRequest {
        if (page < 0) page = 0;
        if (size < 1 || size > 50) size = 20;
    }
}
