package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

/** How many roles and role templates an organization has, with every permission a role can grant. */
public record RoleCatalogMetadataDto(long roles, long templates, List<PermissionGroupDto> permissionCatalog) {
}
