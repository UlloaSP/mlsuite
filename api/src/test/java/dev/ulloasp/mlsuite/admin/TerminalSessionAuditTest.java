package dev.ulloasp.mlsuite.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentClient;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentException;
import dev.ulloasp.mlsuite.admin.infrastructure.TerminalSessionRequest;
import dev.ulloasp.mlsuite.admin.infrastructure.TerminalSessionResponse;
import dev.ulloasp.mlsuite.admin.infrastructure.TerminalSessions;
import dev.ulloasp.mlsuite.admin.infrastructure.ws.InfrastructureTerminalWebSocketHandler;
import dev.ulloasp.mlsuite.admin.infrastructure.ws.OpsAgentBridgeFactory;
import dev.ulloasp.mlsuite.admin.infrastructure.ws.SuperadminWebSocketGuard;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

/**
 * Every terminal session opened through the API has one close event, however it ends: closed by
 * its superadmin, left by their browser, or ended by the ops agent (idle cleanup, the shell
 * exiting, the agent restarting). What is typed in it is never recorded.
 */
class TerminalSessionAuditTest extends PublicPredictionFixture {

    @MockitoBean OpsAgentClient opsAgent;
    @Autowired TerminalSessions terminals;
    @Autowired JdbcTemplate jdbc;

    private String sessionId;

    @BeforeEach
    void anOpenSession() {
        sessionId = UUID.randomUUID().toString();
        TerminalSessionRequest request = new TerminalSessionRequest("py-analyzer", 120, 36);
        when(opsAgent.createTerminalSession(request)).thenReturn(new TerminalSessionResponse(sessionId, "/internal"));
        terminals.open(owner.getId(), request);
    }

    @Test
    void closingItRecordsOneEndHoweverOftenItIsAsked() {
        terminals.end(AuditActor.user(owner.getId()), sessionId, "disconnected");
        terminals.end(AuditActor.user(owner.getId()), sessionId, "closed");

        assertEquals(List.of(Map.of("action", "TERMINAL_SESSION_OPEN", "actor_kind", "USER")), events("OPEN"));
        assertEquals(List.of(Map.of("action", "TERMINAL_SESSION_CLOSE", "actor_kind", "USER", "reason", "disconnected")),
                events("CLOSE"));
        verify(opsAgent, times(2)).closeTerminalSession(sessionId);
    }

    @Test
    void aSessionTheAgentNoLongerHasEndsOnTheNextLook() {
        when(opsAgent.terminalSessionIds()).thenReturn(Set.of(sessionId));
        terminals.reap();
        assertEquals(List.of(), events("CLOSE"));

        when(opsAgent.terminalSessionIds()).thenReturn(Set.of());
        terminals.reap();
        terminals.reap();

        assertEquals(List.of(Map.of("action", "TERMINAL_SESSION_CLOSE", "actor_kind", "SYSTEM", "reason", "ended")),
                events("CLOSE"));
    }

    @Test
    void anAgentThatCannotAnswerEndsNothing() {
        when(opsAgent.terminalSessionIds()).thenThrow(new OpsAgentException(502, "Ops agent unavailable."));

        terminals.reap();

        assertEquals(List.of(), events("CLOSE"));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM terminal_session WHERE id = ?", Integer.class,
                sessionId));
    }

    @Test
    void theBrowserLeavingEndsItUnderItsSuperadmin() throws Exception {
        WebSocketSession socket = mock(WebSocketSession.class);
        var principal = new AuthenticatedUserPrincipal(owner.getId(), "root", "hash", SystemRole.SUPERADMIN, true);
        when(socket.getPrincipal()).thenReturn(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
        when(socket.getUri()).thenReturn(URI.create("ws://api/api/admin/infrastructure/terminal/" + sessionId));
        OpsAgentBridgeFactory bridges = mock(OpsAgentBridgeFactory.class);
        var handler = new InfrastructureTerminalWebSocketHandler(new SuperadminWebSocketGuard(), bridges, terminals);

        handler.afterConnectionClosed(socket, CloseStatus.GOING_AWAY);

        verify(bridges).close(socket);
        verify(opsAgent).closeTerminalSession(sessionId);
        assertEquals(List.of(Map.of("action", "TERMINAL_SESSION_CLOSE", "actor_kind", "USER", "reason", "disconnected")),
                events("CLOSE"));
    }

    private List<Map<String, Object>> events(String kind) {
        return jdbc.queryForList("""
                SELECT action, actor_kind, metadata ->> 'reason' AS reason FROM audit_event
                WHERE target_id = ? AND action = ? ORDER BY id""", sessionId, "TERMINAL_SESSION_" + kind).stream()
                .map(row -> {
                    Map<String, Object> event = new LinkedHashMap<>(row);
                    if (event.get("reason") == null) event.remove("reason");
                    return event;
                })
                .toList();
    }
}
