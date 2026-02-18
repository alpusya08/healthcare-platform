package kz.healthcare.platform.ai.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record AiStartResponse(
        @JsonProperty("session_id") UUID sessionId,
        @JsonProperty("first_question") AiQuestionDto firstQuestion,
        String disclaimer
) {}
