package kz.healthcare.platform.appointments.application;

import kz.healthcare.platform.appointments.application.dto.*;
import kz.healthcare.platform.appointments.domain.ScheduleTemplate;
import kz.healthcare.platform.appointments.domain.SlotType;
import kz.healthcare.platform.appointments.domain.TimeSlot;
import kz.healthcare.platform.appointments.infrastructure.ScheduleTemplateRepository;
import kz.healthcare.platform.appointments.infrastructure.TimeSlotRepository;
import kz.healthcare.platform.users.domain.Doctor;
import kz.healthcare.platform.users.infrastructure.DoctorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleService {

    private static final ZoneId ALMATY = ZoneId.of("Asia/Almaty");

    private final ScheduleTemplateRepository templateRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final DoctorRepository doctorRepository;

    @Transactional(readOnly = true)
    public List<ScheduleTemplateResponse> getTemplate(UUID doctorId) {
        return templateRepository.findByDoctorIdOrderByDayOfWeekAscStartHourAsc(doctorId)
                .stream()
                .map(this::toTemplateResponse)
                .toList();
    }

    @Transactional
    public List<ScheduleTemplateResponse> saveTemplate(UUID doctorId, SaveTemplateRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NoSuchElementException("Врач не найден"));

        templateRepository.deleteByDoctorId(doctorId);

        List<ScheduleTemplate> templates = request.entries().stream()
                .map(e -> ScheduleTemplate.builder()
                        .doctor(doctor)
                        .dayOfWeek(e.dayOfWeek())
                        .startHour(e.startHour())
                        .startMin(e.startMin())
                        .endHour(e.endHour())
                        .endMin(e.endMin())
                        .slotDurationMin(e.slotDurationMin())
                        .appointmentType(parseSlotType(e.appointmentType()))
                        .build())
                .toList();

        templateRepository.saveAll(templates);
        log.info("schedule.template.saved doctor={} entries={}", doctorId, templates.size());
        return templates.stream().map(this::toTemplateResponse).toList();
    }

    @Transactional
    public int generateSlots(UUID doctorId, GenerateSlotsRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NoSuchElementException("Врач не найден"));

        List<ScheduleTemplate> templates =
                templateRepository.findByDoctorIdOrderByDayOfWeekAscStartHourAsc(doctorId);

        if (templates.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Сначала настройте шаблон расписания");
        }

        LocalDate today = LocalDate.now(ALMATY);
        LocalDate until = today.plusWeeks(request.weeksAhead());

        List<TimeSlot> created = new ArrayList<>();

        for (LocalDate date = today; !date.isAfter(until); date = date.plusDays(1)) {
            int dow = date.getDayOfWeek().getValue(); // 1=Mon..7=Sun
            final LocalDate finalDate = date;
            templates.stream()
                    .filter(t -> t.getDayOfWeek() == dow)
                    .forEach(t -> {
                        LocalTime cursor = LocalTime.of(t.getStartHour(), t.getStartMin());
                        LocalTime end = LocalTime.of(t.getEndHour(), t.getEndMin());
                        while (!cursor.plusMinutes(t.getSlotDurationMin()).isAfter(end)) {
                            Instant start = finalDate.atTime(cursor).atZone(ALMATY).toInstant();
                            Instant slotEnd = finalDate.atTime(cursor.plusMinutes(t.getSlotDurationMin())).atZone(ALMATY).toInstant();

                            boolean exists = timeSlotRepository.existsByDoctorIdAndStartTime(doctorId, start);
                            if (!exists) {
                                created.add(TimeSlot.builder()
                                        .doctor(doctor)
                                        .startTime(start)
                                        .endTime(slotEnd)
                                        .appointmentType(t.getAppointmentType())
                                        .build());
                            }
                            cursor = cursor.plusMinutes(t.getSlotDurationMin());
                        }
                    });
        }

        timeSlotRepository.saveAll(created);
        log.info("schedule.slots.generated doctor={} count={}", doctorId, created.size());
        return created.size();
    }

    @Transactional(readOnly = true)
    public List<DoctorSlotResponse> getDoctorSlots(UUID doctorId) {
        return timeSlotRepository.findByDoctorIdOrderByStartTime(doctorId)
                .stream()
                .map(this::toSlotResponse)
                .toList();
    }

    @Transactional
    public void blockSlot(UUID doctorId, UUID slotId) {
        TimeSlot slot = getOwnedSlot(doctorId, slotId);
        if (slot.isBooked()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Нельзя заблокировать занятый слот");
        }
        slot.setBlocked(true);
        timeSlotRepository.save(slot);
    }

    @Transactional
    public void unblockSlot(UUID doctorId, UUID slotId) {
        TimeSlot slot = getOwnedSlot(doctorId, slotId);
        slot.setBlocked(false);
        timeSlotRepository.save(slot);
    }

    @Transactional
    public void deleteSlot(UUID doctorId, UUID slotId) {
        TimeSlot slot = getOwnedSlot(doctorId, slotId);
        if (slot.isBooked()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Нельзя удалить занятый слот");
        }
        timeSlotRepository.delete(slot);
    }

    private TimeSlot getOwnedSlot(UUID doctorId, UUID slotId) {
        TimeSlot slot = timeSlotRepository.findById(slotId)
                .orElseThrow(() -> new NoSuchElementException("Слот не найден"));
        if (!slot.getDoctor().getId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это не ваш слот");
        }
        return slot;
    }

    private SlotType parseSlotType(String value) {
        try {
            return SlotType.valueOf(value);
        } catch (Exception e) {
            return SlotType.BOTH;
        }
    }

    private ScheduleTemplateResponse toTemplateResponse(ScheduleTemplate t) {
        return new ScheduleTemplateResponse(
                t.getId(),
                t.getDayOfWeek(),
                t.getStartHour(),
                t.getStartMin(),
                t.getEndHour(),
                t.getEndMin(),
                t.getSlotDurationMin(),
                t.getAppointmentType().name()
        );
    }

    private DoctorSlotResponse toSlotResponse(TimeSlot s) {
        return new DoctorSlotResponse(
                s.getId(),
                s.getStartTime(),
                s.getEndTime(),
                s.isBooked(),
                s.isBlocked(),
                s.getAppointmentType().name()
        );
    }
}
