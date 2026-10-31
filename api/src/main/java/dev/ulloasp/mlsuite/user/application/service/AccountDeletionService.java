package dev.ulloasp.mlsuite.user.application.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.admin.purge.PurgeRequestService;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.security.auth.AuthAttemptLimiter;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.port.in.DeleteAccountUseCase;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * Closes the user's own account: it stops working at once, ending every session it has, and the
 * purge then removes their personal account and what is theirs alone. A wrong password counts as a
 * failed sign-in from the caller's network, so a stolen session cannot be used to guess it.
 */
@Service
@RequiredArgsConstructor
public class AccountDeletionService implements DeleteAccountUseCase {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthAttemptLimiter attemptLimiter;
    private final AccountDeletionRules rules;
    private final PurgeRequestService purges;
    private final AuditLogService auditLog;

    @Override
    @Transactional
    public void deleteAccount(Long userId, String password, String caller) {
        attemptLimiter.checkLogin(caller);
        User user = users.findById(userId).orElseThrow(() -> new UserDoesNotExistException(userId));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            attemptLimiter.recordLoginFailure(caller);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That is not your current password.");
        }
        rules.refusal(user).ifPresent(reason -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, reason);
        });
        auditLog.record(AuditActor.user(userId), null, AuditAction.USER_DELETE, userId,
                AuditDetails.of("email", user.getEmail(), "name", user.getFullName()));
        purges.requestOwnAccount(user);
    }
}
