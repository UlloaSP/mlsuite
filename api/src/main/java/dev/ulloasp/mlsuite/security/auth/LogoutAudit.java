package dev.ulloasp.mlsuite.security.auth;

import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.LogoutSuccessEvent;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import lombok.RequiredArgsConstructor;

/** Records a sign-out: Spring ends the session at /api/logout, in a filter no service sees. */
@Component
@RequiredArgsConstructor
public class LogoutAudit {

    private final AuditLogService auditLog;

    @EventListener
    void signedOut(LogoutSuccessEvent event) {
        if (event.getAuthentication().getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
            auditLog.record(AuditActor.user(principal.userId()), null, AuditAction.AUTH_LOGOUT, principal.userId());
        }
    }
}
