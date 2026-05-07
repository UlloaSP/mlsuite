package dev.ulloasp.mlsuite.admin.infrastructure;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/infrastructure")
@PreAuthorize("hasRole('SUPERADMIN')")
public class InfrastructureController {

    private final InfrastructureService infrastructureService;

    public InfrastructureController(InfrastructureService infrastructureService) {
        this.infrastructureService = infrastructureService;
    }

    @GetMapping("/overview")
    public ResponseEntity<JsonNode> overview() {
        return ResponseEntity.ok(infrastructureService.overview());
    }

    @PostMapping("/services/{serviceName}/actions")
    public ResponseEntity<Void> action(
            @PathVariable String serviceName,
            @Valid @RequestBody ServiceActionRequest request) {
        infrastructureService.action(serviceName, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/services/{serviceName}/logs")
    public ResponseEntity<JsonNode> logs(
            @PathVariable String serviceName,
            @RequestParam(defaultValue = "200") int tail) {
        return ResponseEntity.ok(infrastructureService.logs(serviceName, tail));
    }

    @PostMapping("/terminal/sessions")
    public ResponseEntity<TerminalSessionResponse> createTerminalSession(
            @Valid @RequestBody TerminalSessionRequest request) {
        return ResponseEntity.ok(infrastructureService.createTerminalSession(request));
    }

    @DeleteMapping("/terminal/sessions/{sessionId}")
    public ResponseEntity<Void> closeTerminalSession(@PathVariable String sessionId) {
        infrastructureService.closeTerminalSession(sessionId);
        return ResponseEntity.noContent().build();
    }
}
