package kz.healthcare.platform.chat.application;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageDto(
        UUID id,
        UUID appointmentId,
        UUID senderId,
        String senderRole,
        String senderName,
        String content,
        Instant createdAt,
        boolean read
) {}
