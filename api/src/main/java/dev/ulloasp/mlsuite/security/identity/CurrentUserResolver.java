package dev.ulloasp.mlsuite.security.identity;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;

@Component
public class CurrentUserResolver {

    private final UserLookupService userLookupService;

    public CurrentUserResolver(UserLookupService userLookupService) {
        this.userLookupService = userLookupService;
    }

    public CurrentUser resolve(Authentication authentication) {
        if (authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
            return new CurrentUser(principal.userId(), principal.getUsername(), principal.systemRole());
        }
        User user = userLookupService.requireByEmail(authentication.getName());
        return new CurrentUser(user.getId(), user.getUsername(), user.getSystemRole());
    }
}

