package dev.ulloasp.mlsuite.role.application.dto;

import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;

public record RoleSummaryDto(
        Long id,
        String name,
        String slug,
        String scope,
        boolean locked,
        String systemKey) {

    public static RoleSummaryDto from(RoleDefinition role) {
        return new RoleSummaryDto(
                role.getId(),
                role.getName(),
                role.getSlug(),
                role.getScope().name(),
                role.isLocked(),
                role.getSystemKey());
    }
}
