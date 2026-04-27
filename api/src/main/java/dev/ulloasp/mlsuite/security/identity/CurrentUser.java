package dev.ulloasp.mlsuite.security.identity;

import java.util.Set;

public record CurrentUser(
        Long userId,
        String username,
        Long activeOrganizationId,
        String activeOrganizationSlug,
        String activeOrganizationName,
        boolean superadmin,
        Set<String> permissions) {

    public CurrentUser(Long userId, String username) {
        this(userId, username, userId, "default", "Default", false,
                Set.copyOf(dev.ulloasp.mlsuite.rbac.RbacPermissions.ALL));
    }
}
