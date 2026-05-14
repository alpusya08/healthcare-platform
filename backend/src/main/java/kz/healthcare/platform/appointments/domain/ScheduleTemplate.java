package kz.healthcare.platform.appointments.domain;

import jakarta.persistence.*;
import kz.healthcare.platform.users.domain.Doctor;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "schedule_templates")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ScheduleTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "start_hour", nullable = false)
    private int startHour;

    @Column(name = "start_min", nullable = false)
    private int startMin;

    @Column(name = "end_hour", nullable = false)
    private int endHour;

    @Column(name = "end_min", nullable = false)
    private int endMin;

    @Column(name = "slot_duration_min", nullable = false)
    @Builder.Default
    private int slotDurationMin = 60;

    @Enumerated(EnumType.STRING)
    @Column(name = "appointment_type", nullable = false, length = 20)
    @Builder.Default
    private SlotType appointmentType = SlotType.BOTH;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
