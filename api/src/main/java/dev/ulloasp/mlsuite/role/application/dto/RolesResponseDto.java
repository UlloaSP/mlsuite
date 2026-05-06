package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

public record RolesResponseDto(
        List<RoleDefinitionDto> roles,
        List<RoleTemplateDto> templates,
        List<PermissionGroupDto> permissionCatalog,
        RoleStatsDto stats) {
}
