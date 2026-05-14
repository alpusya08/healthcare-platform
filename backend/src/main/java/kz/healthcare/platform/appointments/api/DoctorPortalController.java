package kz.healthcare.platform.appointments.api;

import jakarta.validation.Valid;
import kz.healthcare.platform.appointments.application.AppointmentService;
import kz.healthcare.platform.appointments.application.ScheduleService;
import kz.healthcare.platform.appointments.application.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/doctor")
@RequiredArgsConstructor
public class DoctorPortalController {

    private final AppointmentService appointmentService;
    private final ScheduleService scheduleService;

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

    // --- Schedule management ---

    @GetMapping("/schedule/template")
    public List<ScheduleTemplateResponse> getTemplate(@AuthenticationPrincipal UUID doctorId) {
        return scheduleService.getTemplate(doctorId);
    }

    @PostMapping("/schedule/template")
    public List<ScheduleTemplateResponse> saveTemplate(
            @AuthenticationPrincipal UUID doctorId,
            @Valid @RequestBody SaveTemplateRequest request) {
        return scheduleService.saveTemplate(doctorId, request);
    }

    @PostMapping("/schedule/generate")
    public ResponseEntity<Map<String, Object>> generateSlots(
            @AuthenticationPrincipal UUID doctorId,
            @Valid @RequestBody GenerateSlotsRequest request) {
        int count = scheduleService.generateSlots(doctorId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("created", count));
    }

    @GetMapping("/slots")
    public List<DoctorSlotResponse> mySlots(@AuthenticationPrincipal UUID doctorId) {
        return scheduleService.getDoctorSlots(doctorId);
    }

    @PatchMapping("/slots/{slotId}/block")
    public ResponseEntity<Void> blockSlot(
            @AuthenticationPrincipal UUID doctorId,
            @PathVariable UUID slotId) {
        scheduleService.blockSlot(doctorId, slotId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/slots/{slotId}/unblock")
    public ResponseEntity<Void> unblockSlot(
            @AuthenticationPrincipal UUID doctorId,
            @PathVariable UUID slotId) {
        scheduleService.unblockSlot(doctorId, slotId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/slots/{slotId}")
    public ResponseEntity<Void> deleteSlot(
            @AuthenticationPrincipal UUID doctorId,
            @PathVariable UUID slotId) {
        scheduleService.deleteSlot(doctorId, slotId);
        return ResponseEntity.noContent().build();
    }
}
