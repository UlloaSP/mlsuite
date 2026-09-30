package dev.ulloasp.mlsuite.security.identity;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;

import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

public record CurrentUser(Long userId, String username, SystemRole systemRole) {

    /** Every authenticated session carries the principal built by DatabaseUserDetailsService. */
    public static CurrentUser from(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
            return new CurrentUser(principal.userId(), principal.getUsername(), principal.systemRole());
        }
        throw new AuthenticationCredentialsNotFoundException("Authenticated user required.");
    }

    public boolean isSuperadmin() {
        return systemRole == SystemRole.SUPERADMIN;
    }
}
