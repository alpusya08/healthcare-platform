package kz.healthcare.platform.appointments.api;

import jakarta.validation.Valid;
import kz.healthcare.platform.appointments.application.AppointmentService;
import kz.healthcare.platform.appointments.application.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping("/doctors")
    public List<DoctorSummaryResponse> listDoctors(
            @RequestParam(required = false) String specialization) {
        return appointmentService.listDoctors(specialization);
    }

    @GetMapping("/doctors/search")
    public Page<DoctorSummaryResponse> searchDoctors(
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) BigDecimal minRating,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return appointmentService.listDoctorsFiltered(
                new DoctorFilterRequest(specialization, minRating, maxPrice, minExperience, query, sort, page, size)
        );
    }

    @GetMapping("/doctors/{doctorId}/slots")
    public List<TimeSlotResponse> listSlots(@PathVariable UUID doctorId) {
        return appointmentService.listAvailableSlots(doctorId);
    }

    @GetMapping("/slots/upcoming")
    public List<UpcomingSlotResponse> listUpcomingSlots(
            @RequestParam(required = false) String specialization,
            @RequestParam(defaultValue = "3") int limit) {
        return appointmentService.listUpcomingSlots(specialization, limit);
    }

    @PostMapping
    public ResponseEntity<AppointmentResponse> create(
            @AuthenticationPrincipal UUID patientId,
            @Valid @RequestBody CreateAppointmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(appointmentService.create(patientId, request));
    }

    @GetMapping
    public List<AppointmentResponse> myAppointments(
            @AuthenticationPrincipal UUID patientId) {
        return appointmentService.listForPatient(patientId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(
            @AuthenticationPrincipal UUID patientId,
            @PathVariable UUID id) {
        appointmentService.cancel(patientId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<ReviewResponse> review(
            @AuthenticationPrincipal UUID patientId,
            @PathVariable UUID id,
            @Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(appointmentService.createReview(patientId, id, request));
    }

    @GetMapping("/doctors/{doctorId}/reviews")
    public List<ReviewResponse> doctorReviews(@PathVariable UUID doctorId) {
        return appointmentService.listReviewsForDoctor(doctorId);
    }
}
