package kz.healthcare.platform.appointments.infrastructure;

import kz.healthcare.platform.appointments.domain.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, UUID> {

    @Query("""
            SELECT ts FROM TimeSlot ts
            WHERE ts.doctor.id = :doctorId
              AND ts.booked = false
              AND ts.startTime > CURRENT_TIMESTAMP
            ORDER BY ts.startTime
            """)
    List<TimeSlot> findAvailableByDoctorId(@Param("doctorId") UUID doctorId);
}
