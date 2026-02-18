package kz.healthcare.platform.ai.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StartAnalysisRequest(
        @NotBlank String domainCode,
        @NotBlank @Size(min = 10, max = 5000) String initialDescription,
        boolean consentGiven
) {}
