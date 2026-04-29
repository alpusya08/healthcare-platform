package kz.healthcare.platform.appointments.infrastructure;

import kz.healthcare.platform.appointments.domain.DoctorReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DoctorReviewRepository extends JpaRepository<DoctorReview, UUID> {

    Optional<DoctorReview> findByAppointmentId(UUID appointmentId);

    boolean existsByAppointmentId(UUID appointmentId);

    @Query("""
            SELECT r FROM DoctorReview r
            WHERE r.doctor.id = :doctorId
            ORDER BY r.createdAt DESC
            """)
    List<DoctorReview> findByDoctorId(@Param("doctorId") UUID doctorId);

    @Query("SELECT AVG(CAST(r.rating AS double)) FROM DoctorReview r WHERE r.doctor.id = :doctorId")
    Double averageRatingForDoctor(@Param("doctorId") UUID doctorId);

    long countByDoctorId(UUID doctorId);
}
