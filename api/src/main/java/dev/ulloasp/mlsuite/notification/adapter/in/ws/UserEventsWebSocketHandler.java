package dev.ulloasp.mlsuite.notification.adapter.in.ws;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

/**
 * {@code /api/me/events}: a signed-in member's socket, which the API writes to when something of
 * theirs changes ({@code {"type": "notifications.changed"}}, never the notification itself) and
 * which they never write to. The session cookie authenticates its handshake like any request.
 */
@Component
@RequiredArgsConstructor
public class UserEventsWebSocketHandler extends TextWebSocketHandler {

    static final String USER_ID = "mlsuite.userId";

    private final UserEventSessions sessions;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (!(session.getPrincipal() instanceof Authentication authentication)) {
            session.close(new CloseStatus(4401, "Sign in required"));
            return;
        }
        Long userId = CurrentUser.from(authentication).userId();
        session.getAttributes().put(USER_ID, userId);
        sessions.add(userId, session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        if (session.getAttributes().get(USER_ID) instanceof Long userId) sessions.remove(userId, session);
    }
}
