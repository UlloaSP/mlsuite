package dev.ulloasp.mlsuite.security.auth;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * A person changing their own password. Wrong guesses of the current one count against the
 * network like failed sign-ins, so a borrowed session cannot be used to guess it. The new hash is
 * what ends their other sessions: {@link SessionAccountCheck} finds each one stale on its next
 * request, and the session that asked goes on under the {@link Authentication} returned here.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class PasswordChangeService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthAttemptLimiter attemptLimiter;
    private final AuditLogService auditLog;

    public Authentication change(Long userId, ChangePasswordRequest request, String caller) {
        attemptLimiter.checkLogin(caller);
        User user = userRepository.findById(userId).orElseThrow(() -> new UserDoesNotExistException(userId));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            attemptLimiter.recordLoginFailure(caller);
            throw new IllegalArgumentException("That is not your current password.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Choose a password different from your current one.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        auditLog.record(AuditActor.user(userId), null, AuditAction.USER_PASSWORD_CHANGE, userId);
        AuthenticatedUserPrincipal principal = AuthenticatedUserPrincipal.from(user);
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
    }
}
