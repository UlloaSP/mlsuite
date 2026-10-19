package dev.ulloasp.mlsuite.audit.adapter.in.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.port.in.AuditLogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogUseCase auditLogUseCase;

    /** The organization's audit log, newest first; {@code filter} is an action code or {@code all}. */
    @GetMapping("/api/organizations/{organizationId}/audit-events/catalog")
    public PageDto<AuditEventDto> auditEventCatalog(CurrentUser user, @PathVariable Long organizationId,
            @ModelAttribute CatalogRequest request) {
        return auditLogUseCase.list(user.userId(), organizationId, request);
    }
}
