package dev.ulloasp.mlsuite.notification.domain.exception;

public class NotificationNotFoundException extends RuntimeException {

    public NotificationNotFoundException(Long notificationId) {
        super("Notification " + notificationId + " not found.");
    }
}
