package kz.healthcare.platform.ai.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiStartRequest(
        @JsonProperty("domain_code") String domainCode,
        @JsonProperty("initial_description") String initialDescription,
        @JsonProperty("consent_given") boolean consentGiven
) {}
