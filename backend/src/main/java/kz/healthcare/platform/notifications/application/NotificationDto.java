package kz.healthcare.platform.notifications.application;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        String type,
        String title,
        String message,
        String link,
        boolean read,
        Instant createdAt
) {}
