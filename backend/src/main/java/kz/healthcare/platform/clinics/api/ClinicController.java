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
                .map(c -> new ClinicResponse(
                        c.getId(), c.getName(), c.getAddress(), c.getCity(),
                        c.getPhone(), c.getEmail(), c.getDescription(),
                        c.getWorkingHours(), c.getWebsite()))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClinicResponse> getClinic(@PathVariable UUID id) {
        return clinicRepository.findById(id)
                .map(c -> ResponseEntity.ok(new ClinicResponse(
                        c.getId(), c.getName(), c.getAddress(), c.getCity(),
                        c.getPhone(), c.getEmail(), c.getDescription(),
                        c.getWorkingHours(), c.getWebsite())))
                .orElseThrow(() -> new NoSuchElementException("Клиника не найдена"));
    }
}
