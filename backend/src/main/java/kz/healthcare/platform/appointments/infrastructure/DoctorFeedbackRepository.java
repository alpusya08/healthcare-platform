package kz.healthcare.platform.appointments.infrastructure;

import kz.healthcare.platform.appointments.domain.DoctorFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DoctorFeedbackRepository extends JpaRepository<DoctorFeedback, UUID> {
    Optional<DoctorFeedback> findByAppointmentId(UUID appointmentId);
    boolean existsByAppointmentId(UUID appointmentId);
}
