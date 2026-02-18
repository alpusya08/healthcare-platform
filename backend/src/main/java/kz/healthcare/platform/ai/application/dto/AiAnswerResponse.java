package kz.healthcare.platform.ai.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiAnswerResponse(
        @JsonProperty("next_question") AiQuestionDto nextQuestion,
        @JsonProperty("is_complete") boolean isComplete
) {}
