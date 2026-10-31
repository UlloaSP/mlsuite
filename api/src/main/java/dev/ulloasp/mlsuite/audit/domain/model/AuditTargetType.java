package dev.ulloasp.mlsuite.audit.domain.model;

/** The kinds of thing an action is done to. */
public enum AuditTargetType {
    API_CLIENT,
    API_CLIENT_KEY,
    API_REQUEST_LOG,
    AUDIT_LOG,
    INFRASTRUCTURE_SERVICE,
    INVITATION,
    MODEL,
    NOTIFICATION_LOG,
    ORGANIZATION,
    ORGANIZATION_MEMBER,
    PLUGIN,
    PREDICTION_JOB,
    PREDICTION_RUN,
    REVIEW,
    ROLE,
    SCHEMA,
    SCHEMA_BOOKMARK,
    SCHEMA_DRAFT,
    SCHEMA_VERSION,
    STORAGE_OBJECT,
    TERMINAL_SESSION,
    USER
}
