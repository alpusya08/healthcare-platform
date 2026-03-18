package kz.healthcare.platform.appointments.api;

import jakarta.validation.Valid;
import kz.healthcare.platform.appointments.application.AppointmentService;
import kz.healthcare.platform.appointments.application.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/doctors/{doctorId}/slots")
    public List<TimeSlotResponse> listSlots(@PathVariable UUID doctorId) {
        return appointmentService.listAvailableSlots(doctorId);
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
}
