package kz.healthcare.platform.appointments.infrastructure;

import kz.healthcare.platform.appointments.domain.ScheduleTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ScheduleTemplateRepository extends JpaRepository<ScheduleTemplate, UUID> {

    List<ScheduleTemplate> findByDoctorIdOrderByDayOfWeekAscStartHourAsc(UUID doctorId);

    @Modifying
    @Query("DELETE FROM ScheduleTemplate t WHERE t.doctor.id = :doctorId")
    void deleteByDoctorId(@Param("doctorId") UUID doctorId);
}
