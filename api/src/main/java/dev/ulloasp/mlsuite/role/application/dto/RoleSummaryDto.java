package dev.ulloasp.mlsuite.role.application.dto;

import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;

import jakarta.annotation.Nullable;

public record RoleSummaryDto(
        Long id,
        String name,
        String slug,
        RoleScope scope,
        boolean locked,
        @Nullable String systemKey) {

    public static RoleSummaryDto from(RoleDefinition role) {
        return new RoleSummaryDto(
                role.getId(),
                role.getName(),
                role.getSlug(),
                role.getScope(),
                role.isLocked(),
                role.getSystemKey());
    }
}
