package kz.healthcare.platform.clinics.infrastructure;

import kz.healthcare.platform.clinics.domain.Clinic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClinicRepository extends JpaRepository<Clinic, UUID> {
    List<Clinic> findAllByOrderByNameAsc();
}
