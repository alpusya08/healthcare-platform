package kz.healthcare.platform.ai.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record AiAnswerRequest(
        @JsonProperty("question_id") UUID questionId,
        String answer
) {}
