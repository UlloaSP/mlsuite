package dev.ulloasp.mlsuite.audit.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.audit.application.dto.AuditEventDto;

public interface AuditLogUseCase {

    List<AuditEventDto> list(Long userId, Long organizationId);
}
