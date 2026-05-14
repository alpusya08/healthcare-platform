package kz.healthcare.platform.appointments.application;

import kz.healthcare.platform.appointments.application.dto.*;
import kz.healthcare.platform.appointments.domain.Appointment;
import kz.healthcare.platform.appointments.domain.AppointmentStatus;
import kz.healthcare.platform.appointments.domain.DoctorFeedback;
import kz.healthcare.platform.appointments.domain.DoctorReview;
import kz.healthcare.platform.appointments.domain.TimeSlot;
import kz.healthcare.platform.appointments.domain.exceptions.AppointmentNotCancellableException;
import kz.healthcare.platform.appointments.domain.exceptions.SlotAlreadyBookedException;
import kz.healthcare.platform.ai.application.AiServiceClient;
import kz.healthcare.platform.appointments.infrastructure.AppointmentRepository;
import kz.healthcare.platform.appointments.infrastructure.DoctorFeedbackRepository;
import kz.healthcare.platform.appointments.infrastructure.DoctorReviewRepository;
import kz.healthcare.platform.appointments.infrastructure.TimeSlotRepository;
import kz.healthcare.platform.users.domain.Doctor;
import kz.healthcare.platform.users.domain.Patient;
import kz.healthcare.platform.notifications.application.NotificationService;
import kz.healthcare.platform.users.infrastructure.DoctorRepository;
import kz.healthcare.platform.users.infrastructure.PatientRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import kz.healthcare.platform.users.infrastructure.DoctorSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

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
    private final NotificationService notificationService;
    private final PatientRepository patientRepository;
    private final DoctorFeedbackRepository feedbackRepository;
    private final DoctorReviewRepository reviewRepository;
    private final AiServiceClient aiServiceClient;

    @Transactional(readOnly = true)
    public List<DoctorSummaryResponse> listDoctors(String specializationCode) {
        return doctorRepository.findVerified(specializationCode).stream()
                .map(this::toDoctorSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<DoctorSummaryResponse> listDoctorsFiltered(DoctorFilterRequest filter) {
        Sort sort = switch (filter.sort() == null ? "rating_desc" : filter.sort()) {
            case "price_asc" -> Sort.by("consultationFee").ascending();
            case "price_desc" -> Sort.by("consultationFee").descending();
            case "experience_desc" -> Sort.by("yearsExperience").descending();
            default -> Sort.by("averageRating").descending();
        };

        Specification<Doctor> spec = DoctorSpecifications.combined(
                filter.specialization(),
                filter.minRating(),
                filter.maxPrice(),
                filter.query(),
                filter.minExperience()
        );

        return doctorRepository.findAll(spec, PageRequest.of(filter.page(), filter.size(), sort))
                .map(this::toDoctorSummary);
    }

    @Transactional(readOnly = true)
    public List<TimeSlotResponse> listAvailableSlots(UUID doctorId) {
        return timeSlotRepository.findAvailableByDoctorId(doctorId).stream()
                .map(ts -> new TimeSlotResponse(ts.getId(), ts.getStartTime(), ts.getEndTime()))
                .toList();
    }

    @Transactional(readOnly = true)
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

        String meetingLink = request.type() == kz.healthcare.platform.appointments.domain.AppointmentType.ONLINE
                ? "https://meet.jit.si/medai-" + slot.getId().toString().replace("-", "").substring(0, 12)
                : null;

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .timeSlot(slot)
                .type(request.type())
                .complaint(request.complaint())
                .aiSessionId(request.aiSessionId())
                .meetingLink(meetingLink)
                .build();

        Appointment saved = appointmentRepository.save(appointment);
        log.info("appointment.created patient={} doctor={} slot={}", patientId, doctor.getId(), slot.getId());

        String slotTime = slot.getStartTime().atZone(java.time.ZoneId.of("Asia/Almaty"))
                .format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"));
        notificationService.create(doctor.getId(),
                "NEW_APPOINTMENT",
                "Новая запись на приём",
                "Пациент " + patient.getUser().getFullName() + " записался к вам на " + slotTime,
                "/doctor");
        notificationService.create(patientId,
                "APPOINTMENT_CONFIRMED",
                "Запись подтверждена",
                "Вы записаны к " + doctor.getUser().getFullName() + " на " + slotTime,
                "/appointments");

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

    @Transactional
    public void markCompleted(UUID doctorId, UUID appointmentId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NoSuchElementException("Запись не найдена"));
        if (!appt.getDoctor().getId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это не ваша запись");
        }
        if (appt.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Можно завершить только запланированный приём");
        }
        appt.setStatus(AppointmentStatus.COMPLETED);
        appt.setUpdatedAt(Instant.now());
        appointmentRepository.save(appt);
        log.info("appointment.completed doctor={} appointment={}", doctorId, appointmentId);

        notificationService.create(appt.getPatient().getId(),
                "LEAVE_REVIEW",
                "Оставьте отзыв о приёме",
                "Как прошёл ваш приём у " + appt.getDoctor().getUser().getFullName() + "? Поделитесь впечатлением!",
                "/appointments");
    }

    @Transactional(readOnly = true)
    public List<DoctorAppointmentResponse> listForDoctor(UUID doctorId) {
        return appointmentRepository.findByDoctorIdOrderBySlot(doctorId).stream()
                .map(this::toDoctorAppointmentResponse)
                .toList();
    }

    @Transactional
    public void markNoShow(UUID doctorId, UUID appointmentId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NoSuchElementException("Запись не найдена"));
        if (!appt.getDoctor().getId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это не ваша запись");
        }
        if (appt.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Можно отметить только запланированный приём");
        }
        appt.setStatus(AppointmentStatus.NO_SHOW);
        appt.setUpdatedAt(Instant.now());
        appointmentRepository.save(appt);
        log.info("appointment.no_show doctor={} appointment={}", doctorId, appointmentId);
    }

    @Transactional(readOnly = true)
    public DoctorProfileResponse getDoctorProfile(UUID doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NoSuchElementException("Врач не найден"));
        return new DoctorProfileResponse(
                doctor.getId(),
                doctor.getUser().getFullName(),
                doctor.getUser().getEmail(),
                doctor.getSpecialization().getDisplayName(),
                doctor.getSpecialization().getCode(),
                doctor.getYearsExperience(),
                doctor.getBio(),
                doctor.getConsultationFee(),
                doctor.getAverageRating(),
                doctor.isVerified(),
                doctor.getLicenseNumber()
        );
    }

    @Transactional
    public DoctorProfileResponse updateDoctorProfile(UUID doctorId, UpdateDoctorProfileRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NoSuchElementException("Врач не найден"));
        if (request.bio() != null) {
            doctor.setBio(request.bio().isBlank() ? null : request.bio().trim());
        }
        if (request.consultationFee() != null) {
            doctor.setConsultationFee(request.consultationFee());
        }
        doctorRepository.save(doctor);
        return getDoctorProfile(doctorId);
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
                .correctedDiagnosis(request.correctedDiagnosis())
                .build();

        feedbackRepository.save(feedback);
        log.info("feedback.submitted doctor={} appointment={} verdict={}", doctorId, appointmentId, request.verdict());

        if (appt.getAiSessionId() != null) {
            aiServiceClient.pushSessionFeedback(
                    appt.getAiSessionId(),
                    appointmentId,
                    request.verdict().name(),
                    request.correctedDiagnosis()
            );
        }
    }

    @Transactional
    public ReviewResponse createReview(UUID patientId, UUID appointmentId, CreateReviewRequest request) {
        Appointment appt = appointmentRepository.findByIdAndPatientId(appointmentId, patientId)
                .orElseThrow(() -> new NoSuchElementException("Запись не найдена"));

        if (appt.getStatus() != AppointmentStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Оставить отзыв можно только после завершённого приёма");
        }
        if (reviewRepository.existsByAppointmentId(appointmentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Отзыв уже оставлен");
        }

        DoctorReview review = DoctorReview.builder()
                .appointment(appt)
                .doctor(appt.getDoctor())
                .patient(appt.getPatient())
                .rating(request.rating().shortValue())
                .comment(request.comment())
                .build();

        reviewRepository.save(review);
        recomputeDoctorRating(appt.getDoctor());
        log.info("review.created doctor={} appointment={} rating={}",
                appt.getDoctor().getId(), appointmentId, request.rating());

        return toReviewResponse(review);
    }

    public List<ReviewResponse> listReviewsForDoctor(UUID doctorId) {
        return reviewRepository.findByDoctorId(doctorId).stream()
                .map(this::toReviewResponse)
                .toList();
    }

    private void recomputeDoctorRating(Doctor doctor) {
        Double avg = reviewRepository.averageRatingForDoctor(doctor.getId());
        if (avg == null) {
            doctor.setAverageRating(BigDecimal.ZERO);
        } else {
            doctor.setAverageRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        }
        doctorRepository.save(doctor);
    }

    private ReviewResponse toReviewResponse(DoctorReview r) {
        return new ReviewResponse(
                r.getId(),
                r.getDoctor().getId(),
                r.getPatient().getId(),
                r.getPatient().getUser().getFullName(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt()
        );
    }

    private DoctorAppointmentResponse toDoctorAppointmentResponse(Appointment a) {
        String phone = patientRepository.findById(a.getPatient().getId())
                .map(p -> p.getPhone()).orElse(null);
        boolean hasFeedback = feedbackRepository.existsByAppointmentId(a.getId());
        return new DoctorAppointmentResponse(
                a.getId(),
                a.getPatient().getId(),
                a.getPatient().getUser().getFullName(),
                phone,
                a.getTimeSlot().getStartTime(),
                a.getTimeSlot().getEndTime(),
                a.getStatus(),
                a.getType(),
                a.getComplaint(),
                a.getAiSessionId(),
                hasFeedback,
                a.getMeetingLink()
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
        boolean hasReview = a.getStatus() == AppointmentStatus.COMPLETED
                && reviewRepository.existsByAppointmentId(a.getId());
        return new AppointmentResponse(
                a.getId(),
                a.getDoctor().getId(),
                a.getDoctor().getUser().getFullName(),
                a.getDoctor().getSpecialization().getDisplayName(),
                a.getTimeSlot().getStartTime(),
                a.getTimeSlot().getEndTime(),
                a.getStatus(),
                a.getType(),
                a.getComplaint(),
                hasReview,
                a.getMeetingLink()
        );
    }
}
