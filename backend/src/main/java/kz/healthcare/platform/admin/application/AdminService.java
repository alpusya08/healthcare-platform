package kz.healthcare.platform.admin.application;

import kz.healthcare.platform.admin.api.dto.AdminStatsResponse;
import kz.healthcare.platform.admin.api.dto.AdminUserResponse;
import kz.healthcare.platform.appointments.domain.AppointmentStatus;
import kz.healthcare.platform.appointments.infrastructure.AppointmentRepository;
import kz.healthcare.platform.users.domain.Role;
import kz.healthcare.platform.users.domain.User;
import kz.healthcare.platform.users.domain.UserStatus;
import kz.healthcare.platform.users.infrastructure.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        List<User> allUsers = userRepository.findAll();
        long totalDoctors = allUsers.stream().filter(u -> u.getRole() == Role.DOCTOR).count();
        long totalPatients = allUsers.stream().filter(u -> u.getRole() == Role.PATIENT).count();

        long totalAppointments = appointmentRepository.count();
        long scheduled = appointmentRepository.findAll().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.SCHEDULED).count();
        long completed = appointmentRepository.findAll().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();

        return new AdminStatsResponse(allUsers.size(), totalDoctors, totalPatients,
                totalAppointments, scheduled, completed);
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(u -> new AdminUserResponse(
                        u.getId(), u.getEmail(), u.getFullName(),
                        u.getRole().name(), u.getStatus().name(),
                        u.getCreatedAt(), u.getLastLoginAt()))
                .toList();
    }

    @Transactional
    public AdminUserResponse setUserStatus(UUID userId, String status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setStatus(UserStatus.valueOf(status));
        userRepository.save(user);
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getFullName(),
                user.getRole().name(), user.getStatus().name(),
                user.getCreatedAt(), user.getLastLoginAt());
    }
}
