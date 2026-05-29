package kz.healthcare.platform.appointments.application;

import kz.healthcare.platform.ai.application.AiServiceClient;
import kz.healthcare.platform.appointments.application.dto.AppointmentResponse;
import kz.healthcare.platform.appointments.application.dto.CreateAppointmentRequest;
import kz.healthcare.platform.appointments.domain.*;
import kz.healthcare.platform.appointments.domain.exceptions.AppointmentNotCancellableException;
import kz.healthcare.platform.appointments.domain.exceptions.SlotAlreadyBookedException;
import kz.healthcare.platform.appointments.infrastructure.AppointmentRepository;
import kz.healthcare.platform.appointments.infrastructure.DoctorFeedbackRepository;
import kz.healthcare.platform.appointments.infrastructure.DoctorReviewRepository;
import kz.healthcare.platform.appointments.infrastructure.TimeSlotRepository;
import kz.healthcare.platform.notifications.application.NotificationService;
import kz.healthcare.platform.users.domain.*;
import kz.healthcare.platform.users.infrastructure.DoctorRepository;
import kz.healthcare.platform.users.infrastructure.PatientRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock private AppointmentRepository appointmentRepository;
    @Mock private TimeSlotRepository timeSlotRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private NotificationService notificationService;
    @Mock private DoctorFeedbackRepository feedbackRepository;
    @Mock private DoctorReviewRepository reviewRepository;
    @Mock private AiServiceClient aiServiceClient;

    @InjectMocks
    private AppointmentService appointmentService;

    // ── helpers ───────────────────────────────────────────────────────────────

    private User buildUser(Role role) {
        return User.builder()
                .email("test@medai.kz")
                .passwordHash("hash")
                .fullName("Test User")
                .role(role)
                .build();
    }

    private Doctor buildDoctor() {
        User docUser = User.builder()
                .email("doctor@medai.kz")
                .passwordHash("hash")
                .fullName("Dr. Test")
                .role(Role.DOCTOR)
                .build();
        Specialization spec = Specialization.builder()
                .code("therapy")
                .displayName("Терапевт")
                .build();
        return Doctor.builder()
                .user(docUser)
                .licenseNumber("DOC-001")
                .specialization(spec)
                .consultationFee(BigDecimal.valueOf(5000))
                .verified(true)
                .build();
    }

    private Patient buildPatient() {
        User patientUser = buildUser(Role.PATIENT);
        return Patient.builder()
                .user(patientUser)
                .birthDate(LocalDate.of(1990, 1, 1))
                .gender(Gender.MALE)
                .build();
    }

    private TimeSlot buildAvailableSlot(Doctor doctor) {
        TimeSlot slot = TimeSlot.builder()
                .doctor(doctor)
                .startTime(Instant.now().plus(1, ChronoUnit.DAYS))
                .endTime(Instant.now().plus(1, ChronoUnit.DAYS).plus(30, ChronoUnit.MINUTES))
                .build();
        // Set ID manually since GenerationType.UUID is assigned by the DB
        try {
            var field = kz.healthcare.platform.appointments.domain.TimeSlot.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(slot, UUID.randomUUID());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return slot;
    }

    // ── create appointment ─────────────────────────────────────────────────────

    @Test
    void create_availableSlot_savesAppointmentAndNotifies() {
        Doctor doctor = buildDoctor();
        Patient patient = buildPatient();
        TimeSlot slot = buildAvailableSlot(doctor);

        UUID patientId = patient.getId();
        CreateAppointmentRequest req = new CreateAppointmentRequest(
                slot.getId(), AppointmentType.OFFLINE, "Головная боль", null
        );

        when(timeSlotRepository.findById(slot.getId())).thenReturn(Optional.of(slot));
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(patient));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppointmentResponse response = appointmentService.create(patientId, req);

        assertThat(response).isNotNull();
        assertThat(slot.isBooked()).isTrue();
        verify(timeSlotRepository).save(slot);
        verify(appointmentRepository).save(any());
        verify(notificationService, times(2)).create(any(), any(), any(), any(), any());
    }

    @Test
    void create_onlineSlot_generatesMeetingLink() {
        Doctor doctor = buildDoctor();
        Patient patient = buildPatient();
        TimeSlot slot = buildAvailableSlot(doctor);

        CreateAppointmentRequest req = new CreateAppointmentRequest(
                slot.getId(), AppointmentType.ONLINE, null, null
        );

        when(timeSlotRepository.findById(slot.getId())).thenReturn(Optional.of(slot));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppointmentResponse response = appointmentService.create(patient.getId(), req);

        assertThat(response.meetingLink()).isNotNull();
        assertThat(response.meetingLink()).startsWith("https://meet.jit.si/medai-");
    }

    @Test
    void create_alreadyBookedSlot_throwsSlotAlreadyBooked() {
        Doctor doctor = buildDoctor();
        TimeSlot slot = buildAvailableSlot(doctor);
        slot.setBooked(true);

        CreateAppointmentRequest req = new CreateAppointmentRequest(
                slot.getId(), AppointmentType.OFFLINE, null, null
        );
        when(timeSlotRepository.findById(slot.getId())).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> appointmentService.create(UUID.randomUUID(), req))
                .isInstanceOf(SlotAlreadyBookedException.class);
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    void create_unknownSlot_throwsNoSuchElement() {
        UUID unknownSlotId = UUID.randomUUID();
        CreateAppointmentRequest req = new CreateAppointmentRequest(
                unknownSlotId, AppointmentType.OFFLINE, null, null
        );
        when(timeSlotRepository.findById(unknownSlotId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> appointmentService.create(UUID.randomUUID(), req))
                .isInstanceOf(NoSuchElementException.class);
    }

    // ── cancel appointment ────────────────────────────────────────────────────

    @Test
    void cancel_scheduledAppointment_setsStatusCancelled() {
        Doctor doctor = buildDoctor();
        Patient patient = buildPatient();
        TimeSlot slot = buildAvailableSlot(doctor);
        slot.setBooked(true);

        Appointment appt = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .timeSlot(slot)
                .type(AppointmentType.OFFLINE)
                .build();

        UUID patientId = patient.getId();
        when(appointmentRepository.findByIdAndPatientId(appt.getId(), patientId))
                .thenReturn(Optional.of(appt));

        appointmentService.cancel(patientId, appt.getId());

        assertThat(appt.getStatus()).isEqualTo(AppointmentStatus.CANCELLED);
        assertThat(slot.isBooked()).isFalse();
        verify(appointmentRepository).save(appt);
    }

    @Test
    void cancel_completedAppointment_throwsNotCancellable() {
        Doctor doctor = buildDoctor();
        Patient patient = buildPatient();
        TimeSlot slot = buildAvailableSlot(doctor);

        Appointment appt = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .timeSlot(slot)
                .type(AppointmentType.OFFLINE)
                .status(AppointmentStatus.COMPLETED)
                .build();

        UUID patientId = patient.getId();
        when(appointmentRepository.findByIdAndPatientId(appt.getId(), patientId))
                .thenReturn(Optional.of(appt));

        assertThatThrownBy(() -> appointmentService.cancel(patientId, appt.getId()))
                .isInstanceOf(AppointmentNotCancellableException.class);
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    void cancel_unknownAppointment_throwsNoSuchElement() {
        UUID patientId = UUID.randomUUID();
        UUID apptId = UUID.randomUUID();
        when(appointmentRepository.findByIdAndPatientId(apptId, patientId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> appointmentService.cancel(patientId, apptId))
                .isInstanceOf(NoSuchElementException.class);
    }

    // ── list appointments ─────────────────────────────────────────────────────

    @Test
    void listForPatient_returnsOnlyPatientAppointments() {
        UUID patientId = UUID.randomUUID();
        when(appointmentRepository.findByPatientIdOrderBySlot(patientId))
                .thenReturn(List.of());

        List<AppointmentResponse> result = appointmentService.listForPatient(patientId);

        assertThat(result).isEmpty();
        verify(appointmentRepository).findByPatientIdOrderBySlot(patientId);
    }
}
