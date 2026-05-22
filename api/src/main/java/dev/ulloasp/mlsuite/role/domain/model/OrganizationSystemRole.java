package dev.ulloasp.mlsuite.role.domain.model;

import java.util.Arrays;
import java.util.Optional;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;

public enum OrganizationSystemRole {
    EXTERNAL_REVIEWER("External Reviewer", "external-reviewer", OrganizationRole.VIEWER);

    private final String label;
    private final String slug;
    private final OrganizationRole legacyRole;

    OrganizationSystemRole(String label, String slug, OrganizationRole legacyRole) {
        this.label = label;
        this.slug = slug;
        this.legacyRole = legacyRole;
    }

    public String label() {
        return label;
    }

    public String slug() {
        return slug;
    }

    public String systemKey() {
        return name();
    }

    public OrganizationRole legacyRole() {
        return legacyRole;
    }

    public boolean matches(RoleDefinition roleDefinition) {
        return roleDefinition != null && systemKey().equals(roleDefinition.getSystemKey());
    }

    public static OrganizationRole legacyRole(RoleDefinition roleDefinition, OrganizationRole fallback) {
        String systemKey = roleDefinition == null ? null : roleDefinition.getSystemKey();
        if (systemKey == null) {
            return fallback;
        }
        return fromSystemKey(systemKey)
                .map(OrganizationSystemRole::legacyRole)
                .orElseGet(() -> OrganizationRole.valueOf(systemKey));
    }

    public static Optional<OrganizationSystemRole> fromSystemKey(String systemKey) {
        return Arrays.stream(values())
                .filter(role -> role.systemKey().equals(systemKey))
                .findFirst();
    }
}
