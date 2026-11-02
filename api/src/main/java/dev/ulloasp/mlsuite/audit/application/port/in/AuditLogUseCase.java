package dev.ulloasp.mlsuite.audit.application.port.in;

import dev.ulloasp.mlsuite.audit.application.dto.AuditEventPageDto;
import dev.ulloasp.mlsuite.audit.application.dto.AuditFilters;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import jakarta.annotation.Nullable;

public interface AuditLogUseCase {

    AuditEventPageDto list(Long userId, Long organizationId, CatalogRequest request, AuditFilters filters);

    /**
     * Every organization and the platform's own events; its controller admits superadmins alone.
     * {@code organization} narrows it to an organization's id, or to {@code platform} for the
     * events that belong to none.
     */
    AuditEventPageDto listPlatform(CatalogRequest request, AuditFilters filters, @Nullable String organization);
}
