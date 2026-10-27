package dev.ulloasp.mlsuite.security.auth;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;

/**
 * Whether a session still speaks for its account. A session keeps the account as it was at sign-in;
 * once the account is disabled or deleted, or its password or system role changes, the session is
 * stale and must end. Workspace roles and permissions are not part of it: they are read from the
 * database on every request.
 */
@Service
@RequiredArgsConstructor
public class SessionAccountCheck {

    private final UserRepository userRepository;

    public boolean isStale(AuthenticatedUserPrincipal principal) {
        return userRepository.findById(principal.userId())
                .map(AuthenticatedUserPrincipal::from)
                .map(current -> !current.isEnabled() || !current.equals(principal))
                .orElse(true);
    }
}
