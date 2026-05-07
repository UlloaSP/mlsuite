package dev.ulloasp.mlsuite.admin.infrastructure.ws;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class InfrastructureTerminalWebSocketHandler extends TextWebSocketHandler {

    private final SuperadminWebSocketGuard guard;
    private final OpsAgentBridgeFactory bridgeFactory;

    public InfrastructureTerminalWebSocketHandler(
            SuperadminWebSocketGuard guard,
            OpsAgentBridgeFactory bridgeFactory) {
        this.guard = guard;
        this.bridgeFactory = bridgeFactory;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (!guard.allow(session)) {
            guard.reject(session);
            return;
        }
        String sessionId = session.getUri().getPath().substring(session.getUri().getPath().lastIndexOf('/') + 1);
        bridgeFactory.open(session, "/internal/terminal/" + sessionId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        bridgeFactory.send(session, message.getPayload());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) {
        bridgeFactory.close(session);
    }
}
