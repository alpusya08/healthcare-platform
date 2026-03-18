package kz.healthcare.platform.users.infrastructure;

import kz.healthcare.platform.users.domain.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DoctorRepository extends JpaRepository<Doctor, UUID> {

    @Query("""
            SELECT d FROM Doctor d
            JOIN FETCH d.user
            JOIN FETCH d.specialization s
            WHERE d.verified = true
              AND (:specCode IS NULL OR s.code = :specCode)
            ORDER BY d.averageRating DESC
            """)
    List<Doctor> findVerified(@Param("specCode") String specCode);
}
