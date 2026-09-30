package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;

import jakarta.annotation.Nullable;

public record RoleTemplateDto(
        Long id,
        String name,
        @Nullable String description,
        String category,
        RoleScope scope,
        List<PermissionKey> permissionKeys) {
}
