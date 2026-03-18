package kz.healthcare.platform.appointments.infrastructure;

import kz.healthcare.platform.appointments.domain.Appointment;
import kz.healthcare.platform.appointments.domain.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    @Query("""
            SELECT a FROM Appointment a
            JOIN FETCH a.doctor d JOIN FETCH d.user
            JOIN FETCH d.specialization
            JOIN FETCH a.timeSlot
            WHERE a.patient.id = :patientId
            ORDER BY a.timeSlot.startTime DESC
            """)
    List<Appointment> findByPatientIdOrderBySlot(@Param("patientId") UUID patientId);

    @Query("""
            SELECT a FROM Appointment a
            JOIN FETCH a.patient p JOIN FETCH p.user
            JOIN FETCH a.timeSlot
            WHERE a.doctor.id = :doctorId
            ORDER BY a.timeSlot.startTime DESC
            """)
    List<Appointment> findByDoctorIdOrderBySlot(@Param("doctorId") UUID doctorId);

    Optional<Appointment> findByIdAndPatientId(UUID id, UUID patientId);
}
