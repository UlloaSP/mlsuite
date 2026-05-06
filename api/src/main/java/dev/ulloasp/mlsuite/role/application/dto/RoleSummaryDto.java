package dev.ulloasp.mlsuite.role.application.dto;

import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;

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

    public static RoleSummaryDto legacy(String key, RoleScope scope) {
        return new RoleSummaryDto(null, key.replace('_', ' '), key.toLowerCase(), scope.name(), true, key);
    }
}
