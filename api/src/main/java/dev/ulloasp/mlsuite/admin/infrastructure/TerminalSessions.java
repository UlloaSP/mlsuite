package dev.ulloasp.mlsuite.admin.infrastructure;

import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import lombok.RequiredArgsConstructor;

/**
 * The terminal sessions opened through the API, from their open to their end. A session ends when
 * its superadmin closes it, when their browser disconnects, or when the ops agent no longer has it
 * (idle cleanup, the shell exiting, the agent restarting), which a look every minute notices. Each
 * end removes the session's row, and only the caller that removed it records the end, so every
 * opened session has one close event whichever way it ends. Keystrokes are never recorded.
 */
@Component
@RequiredArgsConstructor
public class TerminalSessions {

    private static final Logger log = LoggerFactory.getLogger(TerminalSessions.class);

    private final JdbcTemplate jdbc;
    private final OpsAgentClient opsAgent;
    private final AuditLogService auditLog;

    @Transactional
    public TerminalSessionResponse open(Long actorId, TerminalSessionRequest request) {
        TerminalSessionResponse upstream = opsAgent.createTerminalSession(request);
        jdbc.update("INSERT INTO terminal_session (id, opened_by_user_id, service_name) VALUES (?, ?, ?)",
                upstream.sessionId(), actorId, request.serviceName());
        auditLog.record(AuditActor.user(actorId), null, AuditAction.TERMINAL_SESSION_OPEN, upstream.sessionId(),
                AuditDetails.of("service", request.serviceName()));
        return new TerminalSessionResponse(upstream.sessionId(), "/api/admin/infrastructure/terminal/" + upstream.sessionId());
    }

    /** Ends the session on the agent and records how it ended, unless it had already ended. */
    @Transactional
    public void end(AuditActor actor, String sessionId, String reason) {
        opsAgent.closeTerminalSession(sessionId);
        forget(actor, sessionId, reason);
    }

    /** Records the end of every session the agent no longer has. */
    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT1M")
    @Transactional
    public void reap() {
        // Rows first: a session opened after this read is not judged by an older list of the agent's.
        List<String> open = jdbc.queryForList("SELECT id FROM terminal_session", String.class);
        if (open.isEmpty()) return;
        Set<String> live;
        try {
            live = opsAgent.terminalSessionIds();
        } catch (OpsAgentException unreachable) {
            log.debug("The ops agent cannot list its terminal sessions; their ends wait for the next look");
            return;
        }
        open.stream().filter(id -> !live.contains(id)).forEach(id -> forget(AuditActor.SYSTEM, id, "ended"));
    }

    private void forget(AuditActor actor, String sessionId, String reason) {
        if (jdbc.update("DELETE FROM terminal_session WHERE id = ?", sessionId) == 1) {
            auditLog.record(actor, null, AuditAction.TERMINAL_SESSION_CLOSE, sessionId, AuditDetails.of("reason", reason));
        }
    }
}
