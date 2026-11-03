package dev.ulloasp.mlsuite.notification.adapter.in.ws;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import lombok.extern.slf4j.Slf4j;

/**
 * The open event sockets of each signed-in member, one per tab. It lives in this instance's
 * memory, which is every socket there is while Compose runs one spring-app; more API replicas
 * would each hold their own members' sockets and need a fan-out between them (Postgres
 * LISTEN/NOTIFY, for one) to reach a member connected elsewhere.
 */
@Slf4j
@Component
public class UserEventSessions {

    private static final int SEND_TIME_LIMIT_MS = 5_000;
    private static final int BUFFER_SIZE_LIMIT = 64 * 1024;

    private final Map<Long, Set<WebSocketSession>> byUser = new ConcurrentHashMap<>();

    public void add(Long userId, WebSocketSession session) {
        // Sends from several threads (commits, the heartbeat) are serialized per socket.
        byUser.computeIfAbsent(userId, id -> ConcurrentHashMap.newKeySet())
                .add(new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT));
    }

    public void remove(Long userId, WebSocketSession session) {
        byUser.computeIfPresent(userId, (id, sessions) -> {
            sessions.removeIf(open -> open.getId().equals(session.getId()));
            return sessions.isEmpty() ? null : sessions;
        });
    }

    /** Sends {@code json} to every socket the member has open; a socket that fails is closed. */
    public void send(Long userId, String json) {
        Set<WebSocketSession> sessions = byUser.get(userId);
        if (sessions != null) sessions.forEach(session -> deliver(userId, session, new TextMessage(json)));
    }

    public int count(Long userId) {
        Set<WebSocketSession> sessions = byUser.get(userId);
        return sessions == null ? 0 : sessions.size();
    }

    /** Keeps idle sockets alive through proxies and drops the ones that no longer answer. */
    @Scheduled(fixedDelayString = "${mlsuite.user-events.heartbeat-ms:30000}")
    public void heartbeat() {
        byUser.forEach((userId, sessions) ->
                sessions.forEach(session -> deliver(userId, session, new PingMessage(ByteBuffer.allocate(0)))));
    }

    private void deliver(Long userId, WebSocketSession session, WebSocketMessage<?> message) {
        try {
            if (session.isOpen()) {
                session.sendMessage(message);
                return;
            }
        } catch (IOException | RuntimeException ex) {
            log.debug("Event socket {} of user {} failed: {}", session.getId(), userId, ex.getMessage());
            try {
                session.close(CloseStatus.SESSION_NOT_RELIABLE);
            } catch (IOException ignored) {
                // Closing a broken socket can fail too; it is dropped either way.
            }
        }
        remove(userId, session);
    }
}
