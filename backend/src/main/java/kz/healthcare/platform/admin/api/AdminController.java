package kz.healthcare.platform.admin.api;

import io.swagger.v3.oas.annotations.tags.Tag;
import kz.healthcare.platform.admin.api.dto.AdminStatsResponse;
import kz.healthcare.platform.admin.api.dto.AdminUserResponse;
import kz.healthcare.platform.admin.application.AdminService;
import kz.healthcare.platform.ai.application.AiServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin management endpoints")
public class AdminController {

    private final AdminService adminService;
    private final AiServiceClient aiServiceClient;

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> listUsers() {
        return ResponseEntity.ok(adminService.listUsers());
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<AdminUserResponse> setUserStatus(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(adminService.setUserStatus(userId, body.get("status")));
    }

    @GetMapping("/ml-stats")
    public ResponseEntity<Map<String, Object>> getMlStats() {
        return ResponseEntity.ok(aiServiceClient.getMlStats());
    }

    @PostMapping("/ml-retrain")
    public ResponseEntity<Map<String, Object>> triggerRetrain() {
        return ResponseEntity.ok(aiServiceClient.triggerRetrain());
    }
}
