package dev.ulloasp.mlsuite.audit.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.port.in.AuditLogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@RestController
@RequestMapping("/api/organizations/{organizationId}/audit-events")
public class AuditLogController {

    private final CurrentUserResolver currentUserResolver;
    private final AuditLogUseCase auditLogUseCase;

    public AuditLogController(CurrentUserResolver currentUserResolver, AuditLogUseCase auditLogUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.auditLogUseCase = auditLogUseCase;
    }

    @GetMapping
    ResponseEntity<List<AuditEventDto>> list(Authentication authentication, @PathVariable Long organizationId) {
        return ResponseEntity.ok(auditLogUseCase.list(
                currentUserResolver.resolve(authentication).userId(),
                organizationId));
    }
}
