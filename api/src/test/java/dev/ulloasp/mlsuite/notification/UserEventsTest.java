package dev.ulloasp.mlsuite.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import dev.ulloasp.mlsuite.notification.adapter.in.ws.UserEventSessions;
import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;

/**
 * A member's event socket: told that their notifications changed once the change is committed,
 * only them, and never told what the notification says.
 */
class UserEventsTest extends PublicPredictionFixture {

    private static final String CHANGED = "{\"type\":\"notifications.changed\"}";

    @Autowired NotificationService notifications;
    @MockitoBean UserEventSessions sessions;

    @Test
    void theRecipientIsToldOnlyOnceTheNotificationIsCommitted() {
        inTransaction(() -> {
            notifications.notify(owner.getId(), organization.getId(), NotificationKind.MODEL_READY, "1",
                    Map.of("modelName", "risk-forest"));
            verify(sessions, never()).send(anyLong(), anyString());
        });

        verify(sessions).send(owner.getId(), CHANGED);
    }

    @Test
    void aRolledBackNotificationTellsNobody() {
        assertThrows(IllegalStateException.class, () -> inTransaction(() -> {
            notifications.notify(owner.getId(), organization.getId(), NotificationKind.MODEL_READY, "1",
                    Map.of("modelName", "risk-forest"));
            throw new IllegalStateException("the transition failed");
        }));

        verify(sessions, never()).send(anyLong(), anyString());
    }

    @Test
    void aMessageReachesEveryTabOfItsMemberAndNoOneElse() throws Exception {
        UserEventSessions registry = new UserEventSessions();
        WebSocketSession first = open("a");
        WebSocketSession second = open("b");
        WebSocketSession stranger = open("c");
        registry.add(7L, first);
        registry.add(7L, second);
        registry.add(8L, stranger);

        registry.send(7L, CHANGED);

        verify(first).sendMessage(new TextMessage(CHANGED));
        verify(second).sendMessage(new TextMessage(CHANGED));
        verify(stranger, never()).sendMessage(any());
    }

    @Test
    void closedAndBrokenSocketsLeaveTheRegistry() throws Exception {
        UserEventSessions registry = new UserEventSessions();
        WebSocketSession closed = open("a");
        WebSocketSession broken = open("b");
        WebSocketSession healthy = open("c");
        registry.add(7L, closed);
        registry.add(7L, broken);
        registry.add(7L, healthy);
        doThrow(new IOException("gone")).when(broken).sendMessage(any());

        registry.remove(7L, closed);
        registry.send(7L, CHANGED);

        assertEquals(1, registry.count(7L));
        registry.remove(7L, healthy);
        assertEquals(0, registry.count(7L));
    }

    @Test
    void theHeartbeatPingsEveryOpenSocket() throws Exception {
        UserEventSessions registry = new UserEventSessions();
        WebSocketSession session = open("a");
        registry.add(7L, session);

        registry.heartbeat();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<WebSocketMessage<?>> sent = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(session).sendMessage(sent.capture());
        assertEquals(PingMessage.class, sent.getValue().getClass());
    }

    private static WebSocketSession open(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        return session;
    }
}
