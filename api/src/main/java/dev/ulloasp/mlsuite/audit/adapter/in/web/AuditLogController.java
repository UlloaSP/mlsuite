package dev.ulloasp.mlsuite.audit.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.port.in.AuditLogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/organizations/{organizationId}/audit-events")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogUseCase auditLogUseCase;

    @GetMapping
    ResponseEntity<List<AuditEventDto>> list(CurrentUser user, @PathVariable Long organizationId) {
        return ResponseEntity.ok(auditLogUseCase.list(
                user.userId(),
                organizationId));
    }
}
