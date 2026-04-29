package kz.healthcare.platform.appointments.api;

import jakarta.validation.Valid;
import kz.healthcare.platform.ai.application.AiServiceClient;
import kz.healthcare.platform.ai.application.dto.AiReportResponse;
import kz.healthcare.platform.appointments.application.AppointmentService;
import kz.healthcare.platform.appointments.application.dto.DoctorAppointmentResponse;
import kz.healthcare.platform.appointments.application.dto.DoctorFeedbackRequest;
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
    private final AiServiceClient aiServiceClient;

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
}
