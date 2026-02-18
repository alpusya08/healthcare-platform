package kz.healthcare.platform.ai.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AnswerQuestionRequest(
        @NotNull UUID questionId,
        @NotBlank String answer
) {}
