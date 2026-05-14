package kz.healthcare.platform.appointments.api;

import jakarta.validation.Valid;
import kz.healthcare.platform.appointments.application.AppointmentService;
import kz.healthcare.platform.appointments.application.dto.DoctorAppointmentResponse;
import kz.healthcare.platform.appointments.application.dto.DoctorFeedbackRequest;
import kz.healthcare.platform.appointments.application.dto.DoctorProfileResponse;
import kz.healthcare.platform.appointments.application.dto.UpdateDoctorProfileRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/doctor")
@RequiredArgsConstructor
public class DoctorPortalController {

    private final AppointmentService appointmentService;

    @GetMapping("/appointments")
    public List<DoctorAppointmentResponse> myAppointments(
            @AuthenticationPrincipal UUID doctorId) {
        return appointmentService.listForDoctor(doctorId);
    }

    @PostMapping("/appointments/{appointmentId}/feedback")
    public ResponseEntity<Void> submitFeedback(
            @AuthenticationPrincipal UUID doctorId,
            @PathVariable UUID appointmentId,
            @Valid @RequestBody DoctorFeedbackRequest request) {
        appointmentService.submitFeedback(doctorId, appointmentId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/appointments/{appointmentId}/complete")
    public ResponseEntity<Void> markCompleted(
            @AuthenticationPrincipal UUID doctorId,
            @PathVariable UUID appointmentId) {
        appointmentService.markCompleted(doctorId, appointmentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/appointments/{appointmentId}/no-show")
    public ResponseEntity<Void> markNoShow(
            @AuthenticationPrincipal UUID doctorId,
            @PathVariable UUID appointmentId) {
        appointmentService.markNoShow(doctorId, appointmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profile")
    public ResponseEntity<DoctorProfileResponse> getProfile(
            @AuthenticationPrincipal UUID doctorId) {
        return ResponseEntity.ok(appointmentService.getDoctorProfile(doctorId));
    }

    @PatchMapping("/profile")
    public ResponseEntity<DoctorProfileResponse> updateProfile(
            @AuthenticationPrincipal UUID doctorId,
            @Valid @RequestBody UpdateDoctorProfileRequest request) {
        return ResponseEntity.ok(appointmentService.updateDoctorProfile(doctorId, request));
    }
}
