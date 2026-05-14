package kz.healthcare.platform.users.infrastructure;

import kz.healthcare.platform.users.domain.Doctor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DoctorRepository extends JpaRepository<Doctor, UUID>, JpaSpecificationExecutor<Doctor> {

    @Query("""
            SELECT d FROM Doctor d
            JOIN FETCH d.user
            JOIN FETCH d.specialization s
            WHERE d.verified = true
              AND (:specCode IS NULL OR s.code = :specCode)
            ORDER BY d.averageRating DESC
            """)
    List<Doctor> findVerified(@Param("specCode") String specCode);

    @Query(value = """
            SELECT d FROM Doctor d
            JOIN FETCH d.user
            JOIN FETCH d.specialization
            """,
            countQuery = "SELECT count(d) FROM Doctor d")
    Page<Doctor> findAllWithDetails(Pageable pageable);
}
