package kz.healthcare.platform.ai.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kz.healthcare.platform.ai.api.dto.AnswerQuestionRequest;
import kz.healthcare.platform.ai.api.dto.StartAnalysisRequest;
import kz.healthcare.platform.ai.application.AiServiceClient;
import kz.healthcare.platform.ai.application.dto.AiAnswerRequest;
import kz.healthcare.platform.ai.application.dto.AiAnswerResponse;
import kz.healthcare.platform.ai.application.dto.AiReportResponse;
import kz.healthcare.platform.ai.application.dto.AiStartRequest;
import kz.healthcare.platform.ai.application.dto.AiStartResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Tag(name = "AI Analysis", description = "AI-powered medical analysis endpoints")
public class AiAnalysisController {

    private final AiServiceClient aiServiceClient;

    @PostMapping("/analysis/start")
    @Operation(summary = "Start a new AI analysis session")
    public ResponseEntity<AiStartResponse> startAnalysis(
            @Valid @RequestBody StartAnalysisRequest request,
            @AuthenticationPrincipal UUID userId
    ) {
        var aiRequest = new AiStartRequest(
                request.domainCode(),
                request.initialDescription(),
                request.consentGiven()
        );
        AiStartResponse response = aiServiceClient.startAnalysis(aiRequest, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/analysis/{sessionId}/answer")
    @Operation(summary = "Submit an answer to a session question")
    public ResponseEntity<AiAnswerResponse> answerQuestion(
            @PathVariable UUID sessionId,
            @Valid @RequestBody AnswerQuestionRequest request
    ) {
        var aiRequest = new AiAnswerRequest(request.questionId(), request.answer());
        AiAnswerResponse response = aiServiceClient.answerQuestion(sessionId, aiRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/analysis/{sessionId}/finalize")
    @Operation(summary = "Finalize analysis and get diagnosis report")
    public ResponseEntity<AiReportResponse> finalizeAnalysis(@PathVariable UUID sessionId) {
        AiReportResponse response = aiServiceClient.finalizeAnalysis(sessionId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    @Operation(summary = "Check AI service availability")
    public ResponseEntity<Map<String, Object>> aiServiceHealth() {
        boolean healthy = aiServiceClient.isHealthy();
        return ResponseEntity.ok(Map.of(
                "aiService", healthy ? "UP" : "DOWN",
                "available", healthy
        ));
    }
}
