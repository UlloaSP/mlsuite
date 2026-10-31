package dev.ulloasp.mlsuite.notification.domain.model;

/**
 * What happened. Each kind is about one type of target and carries its own payload labels, besides
 * the organizationName every notification about an organization has.
 */
public enum NotificationKind {
    /** bookmarkId, bookmarkName, totalRows, doneRows, failedRows. */
    PREDICTION_JOB_COMPLETED(NotificationTargetType.PREDICTION_JOB),
    /** As PREDICTION_JOB_COMPLETED, with failedRows above zero. */
    PREDICTION_JOB_COMPLETED_WITH_FAILURES(NotificationTargetType.PREDICTION_JOB),
    /** As PREDICTION_JOB_COMPLETED, plus the reason the system stopped it. */
    PREDICTION_JOB_STOPPED(NotificationTargetType.PREDICTION_JOB),
    /** As PREDICTION_JOB_COMPLETED, plus actorName: another member cancelled it. */
    PREDICTION_JOB_CANCELLED(NotificationTargetType.PREDICTION_JOB),
    /** modelName. */
    MODEL_READY(NotificationTargetType.MODEL),
    /** modelName, reason. */
    MODEL_FAILED(NotificationTargetType.MODEL),
    /** inviterName, roleName. */
    INVITATION_RECEIVED(NotificationTargetType.INVITATION),
    /** inviteeName. */
    INVITATION_ACCEPTED(NotificationTargetType.INVITATION),
    /** inviteeName. */
    INVITATION_DECLINED(NotificationTargetType.INVITATION),
    /** inviterName, roleName: a superadmin's invitation is accepted on the spot. */
    ORGANIZATION_JOINED(NotificationTargetType.ORGANIZATION),
    /** schemaName, assignerName. */
    REVIEW_ASSIGNED(NotificationTargetType.REVIEW);

    private final NotificationTargetType targetType;

    NotificationKind(NotificationTargetType targetType) {
        this.targetType = targetType;
    }

    public NotificationTargetType targetType() {
        return targetType;
    }
}
