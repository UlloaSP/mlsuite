package dev.ulloasp.mlsuite.notification.adapter.in.ws;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import dev.ulloasp.mlsuite.notification.application.service.NotificationsChanged;
import lombok.RequiredArgsConstructor;

/** Tells the recipient's open tabs that their notifications changed, once the change is committed. */
@Component
@RequiredArgsConstructor
public class NotificationsChangedPush {

    static final String MESSAGE = "{\"type\":\"notifications.changed\"}";

    private final UserEventSessions sessions;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void push(NotificationsChanged event) {
        sessions.send(event.recipientUserId(), MESSAGE);
    }
}
