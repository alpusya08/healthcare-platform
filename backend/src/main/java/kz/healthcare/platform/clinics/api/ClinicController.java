package kz.healthcare.platform.clinics.api;

import kz.healthcare.platform.clinics.application.ClinicResponse;
import kz.healthcare.platform.clinics.infrastructure.ClinicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clinics")
@RequiredArgsConstructor
public class ClinicController {

    private final ClinicRepository clinicRepository;

    @GetMapping
    public List<ClinicResponse> listClinics() {
        return clinicRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClinicResponse> getClinic(@PathVariable UUID id) {
        return clinicRepository.findById(id)
                .map(c -> ResponseEntity.ok(toResponse(c)))
                .orElseThrow(() -> new NoSuchElementException("Клиника не найдена"));
    }

    private ClinicResponse toResponse(kz.healthcare.platform.clinics.domain.Clinic c) {
        return new ClinicResponse(
                c.getId(), c.getName(), c.getAddress(), c.getCity(),
                c.getPhone(), c.getEmail(), c.getDescription(),
                c.getWorkingHours(), c.getWebsite(),
                c.getPhotoUrl(), c.getGisUrl(), c.getLat(), c.getLng());
    }
}
