package kz.healthcare.platform.ai.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties("app.ai-service")
public record AiServiceProperties(
        String baseUrl,
        String internalToken,
        Duration timeout
) {}
