package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

public record RoleDefinitionDto(
        Long id,
        String name,
        String slug,
        String description,
        String scope,
        boolean locked,
        String systemKey,
        long userCount,
        List<PermissionDto> permissions,
        RoleActionsDto actions) {
}
