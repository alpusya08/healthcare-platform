package kz.healthcare.platform.users.infrastructure;

import kz.healthcare.platform.users.domain.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {
}
