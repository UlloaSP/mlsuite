package dev.ulloasp.mlsuite.audit.application.port.in;

import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.audit.application.dto.AuditFilters;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import jakarta.annotation.Nullable;

public interface AuditLogUseCase {

    PageDto<AuditEventDto> list(Long userId, Long organizationId, CatalogRequest request, AuditFilters filters);

    /**
     * Every organization and the platform's own events; its controller admits superadmins alone.
     * {@code organization} narrows it to an organization's id, or to {@code platform} for the
     * events that belong to none.
     */
    PageDto<AuditEventDto> listPlatform(CatalogRequest request, AuditFilters filters, @Nullable String organization);
}
