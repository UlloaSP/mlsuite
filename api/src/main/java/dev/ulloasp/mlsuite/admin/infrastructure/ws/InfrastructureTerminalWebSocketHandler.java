package dev.ulloasp.mlsuite.admin.infrastructure.ws;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import dev.ulloasp.mlsuite.admin.infrastructure.TerminalSessions;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

/**
 * Bridges a superadmin's browser to a terminal session on the ops agent. Nothing reattaches to a
 * session, so the browser going away (a closed tab, a lost connection) ends it, and its end is
 * recorded under that superadmin.
 */
@Component
@RequiredArgsConstructor
public class InfrastructureTerminalWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(InfrastructureTerminalWebSocketHandler.class);

    private final SuperadminWebSocketGuard guard;
    private final OpsAgentBridgeFactory bridgeFactory;
    private final TerminalSessions terminals;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (!guard.allow(session)) {
            guard.reject(session);
            return;
        }
        bridgeFactory.open(session, "/internal/terminal/" + sessionId(session));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        bridgeFactory.send(session, message.getPayload());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        bridgeFactory.close(session);
        if (!guard.allow(session)) return;
        try {
            terminals.end(AuditActor.user(CurrentUser.from((Authentication) session.getPrincipal()).userId()),
                    sessionId(session), "disconnected");
        } catch (RuntimeException failure) {
            // The minute's look at the agent's sessions records its end once the agent no longer has it.
            log.warn("Could not end terminal session {} after its browser left", sessionId(session), failure);
        }
    }

    private static String sessionId(WebSocketSession session) {
        String path = session.getUri().getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }
}
