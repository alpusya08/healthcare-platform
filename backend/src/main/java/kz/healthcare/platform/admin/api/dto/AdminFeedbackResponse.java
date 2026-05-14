package kz.healthcare.platform.admin.api.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminFeedbackResponse(
        UUID id,
        String doctorName,
        String verdict,
        String comment,
        String correctedDiagnosis,
        Instant createdAt
) {}
