package kz.healthcare.platform.users.infrastructure;

import kz.healthcare.platform.users.domain.Specialization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SpecializationRepository extends JpaRepository<Specialization, UUID> {
}
