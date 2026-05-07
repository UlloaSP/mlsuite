package dev.ulloasp.mlsuite.admin.infrastructure.ws;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class InfrastructureStreamWebSocketHandler extends TextWebSocketHandler {

    private final SuperadminWebSocketGuard guard;
    private final OpsAgentBridgeFactory bridgeFactory;

    public InfrastructureStreamWebSocketHandler(
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
        bridgeFactory.open(session, "/internal/stream");
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
