package dev.ulloasp.mlsuite.role.application.port.in;

import dev.ulloasp.mlsuite.role.application.dto.RolesResponseDto;

public interface RoleCatalogUseCase {

    RolesResponseDto list(Long userId, Long organizationId);
}
