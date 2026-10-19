package dev.ulloasp.mlsuite.audit.application.port.in;

import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

public interface AuditLogUseCase {

    PageDto<AuditEventDto> list(Long userId, Long organizationId, CatalogRequest request);
}
