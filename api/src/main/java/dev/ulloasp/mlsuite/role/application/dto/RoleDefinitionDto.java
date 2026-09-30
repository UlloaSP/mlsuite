package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.role.domain.model.RoleScope;

import jakarta.annotation.Nullable;

public record RoleDefinitionDto(
        Long id,
        String name,
        String slug,
        @Nullable String description,
        RoleScope scope,
        boolean locked,
        @Nullable String systemKey,
        long userCount,
        List<PermissionDto> permissions,
        RoleActionsDto actions) {
}
