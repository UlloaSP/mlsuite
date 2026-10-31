package dev.ulloasp.mlsuite.audit.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.dto.AuditFilters;
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
            @ModelAttribute CatalogRequest request, @ModelAttribute AuditFilters filters) {
        return auditLogUseCase.list(user.userId(), organizationId, request, filters);
    }

    /**
     * Every organization's log and the platform's own events, for the platform's administrators;
     * {@code organization} is an organization's id, or {@code platform} for its own events alone.
     */
    @GetMapping("/api/admin/audit-events/catalog")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public PageDto<AuditEventDto> platformAuditEventCatalog(@ModelAttribute CatalogRequest request,
            @ModelAttribute AuditFilters filters, @RequestParam(required = false) String organization) {
        return auditLogUseCase.listPlatform(request, filters, organization);
    }
}
