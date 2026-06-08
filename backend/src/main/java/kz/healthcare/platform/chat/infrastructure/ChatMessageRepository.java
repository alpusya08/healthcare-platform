package kz.healthcare.platform.chat.infrastructure;

import kz.healthcare.platform.chat.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByAppointmentIdOrderByCreatedAtAsc(UUID appointmentId);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.readAt = :now " +
           "WHERE m.appointmentId = :appointmentId AND m.senderId <> :readerId AND m.readAt IS NULL")
    void markRead(@Param("appointmentId") UUID appointmentId,
                  @Param("readerId") UUID readerId,
                  @Param("now") Instant now);

    @Query("SELECT COUNT(m) FROM ChatMessage m " +
           "WHERE m.appointmentId = :appointmentId AND m.senderId <> :userId AND m.readAt IS NULL")
    long countUnread(@Param("appointmentId") UUID appointmentId, @Param("userId") UUID userId);

    @Query(value = """
            SELECT cm.appointment_id, COUNT(cm.id)
            FROM chat_messages cm
            JOIN appointments a ON cm.appointment_id = a.id
            WHERE (a.patient_id = :userId OR a.doctor_id = :userId)
              AND cm.sender_id <> :userId
              AND cm.read_at IS NULL
            GROUP BY cm.appointment_id
            """, nativeQuery = true)
    List<Object[]> countUnreadPerAppointment(@Param("userId") UUID userId);
}
