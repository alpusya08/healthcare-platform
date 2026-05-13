package kz.healthcare.platform.ai.application;

import kz.healthcare.platform.ai.application.dto.AiAnswerRequest;
import kz.healthcare.platform.ai.application.dto.AiAnswerResponse;
import kz.healthcare.platform.ai.application.dto.AiReportResponse;
import kz.healthcare.platform.ai.application.dto.AiStartRequest;
import kz.healthcare.platform.ai.application.dto.AiStartResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiServiceClient {

    private final RestClient aiServiceRestClient;

    public AiStartResponse startAnalysis(AiStartRequest request, UUID userId) {
        log.debug("ai_service.start_analysis user_id={} domain={}", userId, request.domainCode());
        return aiServiceRestClient.post()
                .uri("/api/v1/analysis/start?user_id={userId}", userId)
                .body(request)
                .retrieve()
                .body(AiStartResponse.class);
    }

    public AiAnswerResponse answerQuestion(UUID sessionId, AiAnswerRequest request) {
        log.debug("ai_service.answer_question session_id={}", sessionId);
        return aiServiceRestClient.post()
                .uri("/api/v1/analysis/{sessionId}/answer", sessionId)
                .body(request)
                .retrieve()
                .body(AiAnswerResponse.class);
    }

    public AiReportResponse finalizeAnalysis(UUID sessionId) {
        log.debug("ai_service.finalize session_id={}", sessionId);
        return aiServiceRestClient.post()
                .uri("/api/v1/analysis/{sessionId}/finalize", sessionId)
                .retrieve()
                .body(AiReportResponse.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> uploadFile(UUID sessionId, MultipartFile file) {
        try {
            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override public String getFilename() { return file.getOriginalFilename(); }
            };
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", resource);
            return aiServiceRestClient.post()
                    .uri("/api/v1/analysis/{sessionId}/upload", sessionId)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }
    }

    public boolean isHealthy() {
        try {
            var response = aiServiceRestClient.get()
                    .uri("/api/v1/internal/health")
                    .retrieve()
                    .toBodilessEntity();
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("ai_service.health_check_failed error={}", e.getMessage());
            return false;
        }
    }
}
