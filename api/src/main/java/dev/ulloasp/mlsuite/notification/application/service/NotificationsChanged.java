package dev.ulloasp.mlsuite.notification.application.service;

/** A notification was written for {@code recipientUserId}, in the transaction that publishes this. */
public record NotificationsChanged(Long recipientUserId) {
}
