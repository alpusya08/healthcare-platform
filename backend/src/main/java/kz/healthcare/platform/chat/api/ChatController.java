package kz.healthcare.platform.chat.api;

import jakarta.validation.Valid;
import kz.healthcare.platform.chat.application.ChatMessageDto;
import kz.healthcare.platform.chat.application.ChatService;
import kz.healthcare.platform.chat.application.SendMessageRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/{appointmentId}")
    public List<ChatMessageDto> getMessages(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID appointmentId) {
        return chatService.getMessages(appointmentId, userId);
    }

    @PostMapping("/{appointmentId}")
    public ResponseEntity<ChatMessageDto> sendMessage(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID appointmentId,
            @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.sendMessage(appointmentId, userId, request.content()));
    }

    @PatchMapping("/{appointmentId}/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID appointmentId) {
        chatService.markRead(appointmentId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{appointmentId}/unread")
    public long unreadCount(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID appointmentId) {
        return chatService.countUnread(appointmentId, userId);
    }

    @GetMapping("/unread")
    public Map<UUID, Long> allUnreadCounts(@AuthenticationPrincipal UUID userId) {
        return chatService.getUnreadCountsForUser(userId);
    }
}
