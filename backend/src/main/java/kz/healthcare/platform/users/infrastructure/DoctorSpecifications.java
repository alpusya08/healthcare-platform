package kz.healthcare.platform.users.infrastructure;

import jakarta.persistence.criteria.*;
import kz.healthcare.platform.appointments.domain.SlotType;
import kz.healthcare.platform.appointments.domain.TimeSlot;
import kz.healthcare.platform.users.domain.Doctor;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class DoctorSpecifications {

    private DoctorSpecifications() {}

    public static Specification<Doctor> verified() {
        return (root, query, cb) -> cb.isTrue(root.get("verified"));
    }

    public static Specification<Doctor> withSpecialization(String specCode) {
        return (root, query, cb) -> {
            if (specCode == null || specCode.isBlank()) return null;
            return cb.equal(root.get("specialization").get("code"), specCode);
        };
    }

    public static Specification<Doctor> withMinRating(BigDecimal minRating) {
        return (root, query, cb) -> {
            if (minRating == null || minRating.compareTo(BigDecimal.ZERO) <= 0) return null;
            return cb.greaterThanOrEqualTo(root.get("averageRating"), minRating);
        };
    }

    public static Specification<Doctor> withMaxPrice(BigDecimal maxPrice) {
        return (root, query, cb) -> {
            if (maxPrice == null) return null;
            return cb.or(
                    cb.isNull(root.get("consultationFee")),
                    cb.lessThanOrEqualTo(root.get("consultationFee"), maxPrice)
            );
        };
    }

    public static Specification<Doctor> withQuery(String query) {
        return (root, q, cb) -> {
            if (query == null || query.isBlank()) return null;
            String pattern = "%" + query.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("user").get("fullName")), pattern),
                    cb.like(cb.lower(root.get("specialization").get("displayName")), pattern)
            );
        };
    }

    public static Specification<Doctor> withMinExperience(Integer minExperience) {
        return (root, query, cb) -> {
            if (minExperience == null || minExperience <= 0) return null;
            return cb.greaterThanOrEqualTo(root.get("yearsExperience"), minExperience);
        };
    }

    public static Specification<Doctor> acceptsOnline() {
        return (root, query, cb) -> {
            Subquery<Long> sub = query.subquery(Long.class);
            Root<TimeSlot> slot = sub.from(TimeSlot.class);
            sub.select(cb.count(slot))
               .where(
                   cb.equal(slot.get("doctor").get("id"), root.get("id")),
                   cb.isFalse(slot.get("booked")),
                   cb.isFalse(slot.get("blocked")),
                   cb.greaterThan(slot.get("startTime"), Instant.now()),
                   cb.or(
                       cb.equal(slot.get("appointmentType"), SlotType.ONLINE_ONLY),
                       cb.equal(slot.get("appointmentType"), SlotType.BOTH)
                   )
               );
            return cb.greaterThan(sub, 0L);
        };
    }

    public static Specification<Doctor> combined(
            String specCode,
            BigDecimal minRating,
            BigDecimal maxPrice,
            String query,
            Integer minExperience,
            Boolean onlineOnly
    ) {
        Specification<Doctor> spec = Specification.allOf(
                verified(),
                withSpecialization(specCode),
                withMinRating(minRating),
                withMaxPrice(maxPrice),
                withQuery(query),
                withMinExperience(minExperience)
        );
        if (Boolean.TRUE.equals(onlineOnly)) {
            spec = spec.and(acceptsOnline());
        }
        return spec;
    }
}
