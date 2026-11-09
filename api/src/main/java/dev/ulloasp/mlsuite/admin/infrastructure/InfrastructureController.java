package dev.ulloasp.mlsuite.admin.infrastructure;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import tools.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/infrastructure")
@PreAuthorize("hasRole('SUPERADMIN')")
@RequiredArgsConstructor
public class InfrastructureController {

    private final InfrastructureService infrastructureService;

    @GetMapping("/overview")
    public ResponseEntity<JsonNode> overview() {
        return ResponseEntity.ok(infrastructureService.overview());
    }

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/services/{serviceName}/actions")
    public ResponseEntity<Void> action(
            CurrentUser actor,
            @PathVariable String serviceName,
            @Valid @RequestBody ServiceActionRequest request) {
        infrastructureService.action(actor.userId(), serviceName, request);
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
            CurrentUser actor,
            @Valid @RequestBody TerminalSessionRequest request) {
        return ResponseEntity.ok(infrastructureService.createTerminalSession(actor.userId(), request));
    }

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @DeleteMapping("/terminal/sessions/{sessionId}")
    public ResponseEntity<Void> closeTerminalSession(CurrentUser actor, @PathVariable String sessionId) {
        infrastructureService.closeTerminalSession(actor.userId(), sessionId);
        return ResponseEntity.noContent().build();
    }
}
