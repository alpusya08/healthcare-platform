package kz.healthcare.platform.chat.application;

import kz.healthcare.platform.appointments.domain.Appointment;
import kz.healthcare.platform.appointments.infrastructure.AppointmentRepository;
import kz.healthcare.platform.chat.domain.ChatMessage;
import kz.healthcare.platform.chat.infrastructure.ChatMessageRepository;
import kz.healthcare.platform.users.infrastructure.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

    @Transactional
    public List<ChatMessageDto> getMessages(UUID appointmentId, UUID userId) {
        Appointment appt = loadAndVerify(appointmentId, userId);
        chatMessageRepository.markRead(appointmentId, userId, Instant.now());
        return chatMessageRepository.findByAppointmentIdOrderByCreatedAtAsc(appointmentId)
                .stream()
                .map(m -> toDto(m, userId))
                .toList();
    }

    @Transactional
    public ChatMessageDto sendMessage(UUID appointmentId, UUID userId, String content) {
        Appointment appt = loadAndVerify(appointmentId, userId);

        String role = appt.getPatient().getId().equals(userId) ? "PATIENT" : "DOCTOR";
        String senderName = userRepository.findById(userId)
                .map(u -> u.getFullName())
                .orElse("Неизвестный");

        ChatMessage message = ChatMessage.builder()
                .appointmentId(appointmentId)
                .senderId(userId)
                .senderRole(role)
                .senderName(senderName)
                .content(content)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        return toDto(saved, userId);
    }

    @Transactional
    public void markRead(UUID appointmentId, UUID userId) {
        loadAndVerify(appointmentId, userId);
        chatMessageRepository.markRead(appointmentId, userId, Instant.now());
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID appointmentId, UUID userId) {
        loadAndVerify(appointmentId, userId);
        return chatMessageRepository.countUnread(appointmentId, userId);
    }

    @Transactional(readOnly = true)
    public Map<UUID, Long> getUnreadCountsForUser(UUID userId) {
        return chatMessageRepository.countUnreadPerAppointment(userId)
                .stream()
                .collect(Collectors.toMap(
                        row -> UUID.fromString(row[0].toString()),
                        row -> ((Number) row[1]).longValue()
                ));
    }

    private Appointment loadAndVerify(UUID appointmentId, UUID userId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Запись не найдена"));

        boolean isPatient = appt.getPatient().getId().equals(userId);
        boolean isDoctor  = appt.getDoctor().getId().equals(userId);

        if (!isPatient && !isDoctor) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Доступ запрещён");
        }
        return appt;
    }

    private ChatMessageDto toDto(ChatMessage m, UUID currentUserId) {
        return new ChatMessageDto(
                m.getId(),
                m.getAppointmentId(),
                m.getSenderId(),
                m.getSenderRole(),
                m.getSenderName(),
                m.getContent(),
                m.getCreatedAt(),
                m.getSenderId().equals(currentUserId) || m.getReadAt() != null
        );
    }
}
