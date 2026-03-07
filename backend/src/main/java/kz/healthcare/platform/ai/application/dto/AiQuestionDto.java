package kz.healthcare.platform.ai.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.UUID;

public record AiQuestionDto(
        UUID id,
        @JsonProperty("question_text") String questionText,
        @JsonProperty("question_type") String questionType,
        List<String> options,
        @JsonProperty("feature_name") String featureName,
        String hint
) {}
