package dev.ulloasp.mlsuite.notification.domain.model;

/** What a notification is about, which decides where it leads. */
public enum NotificationTargetType {
    PREDICTION_JOB,
    MODEL,
    INVITATION,
    ORGANIZATION,
    REVIEW,
    PURGE_JOB
}
