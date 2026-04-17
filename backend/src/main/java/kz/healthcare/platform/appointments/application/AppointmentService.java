package kz.healthcare.platform.appointments.application;

import kz.healthcare.platform.appointments.application.dto.*;
import kz.healthcare.platform.appointments.domain.Appointment;
import kz.healthcare.platform.appointments.domain.AppointmentStatus;
import kz.healthcare.platform.appointments.domain.DoctorFeedback;
import kz.healthcare.platform.appointments.domain.TimeSlot;
import kz.healthcare.platform.appointments.domain.exceptions.AppointmentNotCancellableException;
import kz.healthcare.platform.appointments.domain.exceptions.SlotAlreadyBookedException;
import kz.healthcare.platform.appointments.infrastructure.AppointmentRepository;
import kz.healthcare.platform.appointments.infrastructure.DoctorFeedbackRepository;
import kz.healthcare.platform.appointments.infrastructure.TimeSlotRepository;
import kz.healthcare.platform.users.domain.Doctor;
import kz.healthcare.platform.users.domain.Patient;
import kz.healthcare.platform.users.infrastructure.DoctorRepository;
import kz.healthcare.platform.users.infrastructure.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final DoctorFeedbackRepository feedbackRepository;

    public List<DoctorSummaryResponse> listDoctors(String specializationCode) {
        return doctorRepository.findVerified(specializationCode).stream()
                .map(this::toDoctorSummary)
                .toList();
    }

    public List<TimeSlotResponse> listAvailableSlots(UUID doctorId) {
        return timeSlotRepository.findAvailableByDoctorId(doctorId).stream()
                .map(ts -> new TimeSlotResponse(ts.getId(), ts.getStartTime(), ts.getEndTime()))
                .toList();
    }

    public List<UpcomingSlotResponse> listUpcomingSlots(String specializationCode, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 20);
        return timeSlotRepository
                .findUpcomingBySpecialization(specializationCode, PageRequest.of(0, safeLimit))
                .stream()
                .map(ts -> {
                    Doctor d = ts.getDoctor();
                    return new UpcomingSlotResponse(
                            ts.getId(),
                            ts.getStartTime(),
                            ts.getEndTime(),
                            d.getId(),
                            d.getUser().getFullName(),
                            d.getSpecialization().getDisplayName(),
                            d.getSpecialization().getCode(),
                            d.getYearsExperience(),
                            d.getConsultationFee(),
                            d.getAverageRating()
                    );
                })
                .toList();
    }

    @Transactional
    public AppointmentResponse create(UUID patientId, CreateAppointmentRequest request) {
        TimeSlot slot = timeSlotRepository.findById(request.slotId())
                .orElseThrow(() -> new NoSuchElementException("Слот не найден"));

        if (slot.isBooked()) {
            throw new SlotAlreadyBookedException();
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new NoSuchElementException("Пациент не найден"));
        Doctor doctor = slot.getDoctor();

        slot.setBooked(true);
        timeSlotRepository.save(slot);

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .timeSlot(slot)
                .type(request.type())
                .complaint(request.complaint())
                .aiSessionId(request.aiSessionId())
                .build();

        Appointment saved = appointmentRepository.save(appointment);
        log.info("appointment.created patient={} doctor={} slot={}", patientId, doctor.getId(), slot.getId());
        return toResponse(saved);
    }

    public List<AppointmentResponse> listForPatient(UUID patientId) {
        return appointmentRepository.findByPatientIdOrderBySlot(patientId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void cancel(UUID patientId, UUID appointmentId) {
        Appointment appt = appointmentRepository.findByIdAndPatientId(appointmentId, patientId)
                .orElseThrow(() -> new NoSuchElementException("Запись не найдена"));

        if (appt.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new AppointmentNotCancellableException();
        }

        appt.setStatus(AppointmentStatus.CANCELLED);
        appt.setUpdatedAt(Instant.now());
        appt.getTimeSlot().setBooked(false);
        appointmentRepository.save(appt);
        log.info("appointment.cancelled id={} patient={}", appointmentId, patientId);
    }

    public List<DoctorAppointmentResponse> listForDoctor(UUID doctorId) {
        return appointmentRepository.findByDoctorIdOrderBySlot(doctorId).stream()
                .map(this::toDoctorAppointmentResponse)
                .toList();
    }

    @Transactional
    public void submitFeedback(UUID doctorId, UUID appointmentId, DoctorFeedbackRequest request) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NoSuchElementException("Запись не найдена"));

        if (!appt.getDoctor().getId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это не ваша запись");
        }
        if (feedbackRepository.existsByAppointmentId(appointmentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Отзыв уже отправлен");
        }

        DoctorFeedback feedback = DoctorFeedback.builder()
                .appointment(appt)
                .doctor(appt.getDoctor())
                .aiSessionId(appt.getAiSessionId())
                .verdict(DoctorFeedback.FeedbackVerdict.valueOf(request.verdict().name()))
                .comment(request.comment())
                .build();

        feedbackRepository.save(feedback);
        log.info("feedback.submitted doctor={} appointment={} verdict={}", doctorId, appointmentId, request.verdict());
    }

    private DoctorAppointmentResponse toDoctorAppointmentResponse(Appointment a) {
        return new DoctorAppointmentResponse(
                a.getId(),
                a.getPatient().getId(),
                a.getPatient().getUser().getFullName(),
                a.getTimeSlot().getStartTime(),
                a.getTimeSlot().getEndTime(),
                a.getStatus(),
                a.getType(),
                a.getComplaint(),
                a.getAiSessionId()
        );
    }

    private DoctorSummaryResponse toDoctorSummary(Doctor d) {
        return new DoctorSummaryResponse(
                d.getId(),
                d.getUser().getFullName(),
                d.getSpecialization().getDisplayName(),
                d.getSpecialization().getCode(),
                d.getYearsExperience(),
                d.getBio(),
                d.getConsultationFee(),
                d.getAverageRating()
        );
    }

    private AppointmentResponse toResponse(Appointment a) {
        return new AppointmentResponse(
                a.getId(),
                a.getDoctor().getId(),
                a.getDoctor().getUser().getFullName(),
                a.getDoctor().getSpecialization().getDisplayName(),
                a.getTimeSlot().getStartTime(),
                a.getTimeSlot().getEndTime(),
                a.getStatus(),
                a.getType(),
                a.getComplaint()
        );
    }
}
