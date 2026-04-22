package kz.healthcare.platform.ai.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AiReportResponse(
        @JsonProperty("session_id") UUID sessionId,
        @JsonProperty("triage_level") String triageLevel,
        @JsonProperty("primary_diagnosis") String primaryDiagnosis,
        double confidence,
        String explanation,
        List<String> recommendations,
        @JsonProperty("model_version") String modelVersion,
        String disclaimer,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("recommended_specialization") String recommendedSpecialization,
        @JsonProperty("possible_causes") List<String> possibleCauses,
        @JsonProperty("red_flags") List<String> redFlags,
        String summary
) {}
