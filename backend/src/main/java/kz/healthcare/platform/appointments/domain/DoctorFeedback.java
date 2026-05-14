package kz.healthcare.platform.appointments.domain;

import jakarta.persistence.*;
import kz.healthcare.platform.users.domain.Doctor;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "doctor_feedback")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class DoctorFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "ai_session_id")
    private UUID aiSessionId;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "feedback_verdict", nullable = false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private FeedbackVerdict verdict;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String comment;

    @Column(name = "corrected_diagnosis", columnDefinition = "TEXT")
    private String correctedDiagnosis;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum FeedbackVerdict {
        APPROVED, REJECTED, PARTIAL
    }
}
