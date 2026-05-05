package dev.ulloasp.mlsuite.security.identity;

import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

public record CurrentUser(Long userId, String username, SystemRole systemRole) {

    public boolean isSuperadmin() {
        return systemRole == SystemRole.SUPERADMIN;
    }
}

