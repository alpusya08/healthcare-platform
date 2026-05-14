package kz.healthcare.platform.appointments.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DoctorFeedbackRequest(
        @NotNull FeedbackVerdict verdict,
        @NotBlank String comment,
        String correctedDiagnosis
) {
    public enum FeedbackVerdict {
        APPROVED,
        REJECTED,
        PARTIAL
    }
}
