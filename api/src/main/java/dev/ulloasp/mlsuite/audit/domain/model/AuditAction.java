package dev.ulloasp.mlsuite.audit.domain.model;

import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.API_CLIENT;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.API_CLIENT_KEY;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.API_REQUEST_LOG;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.AUDIT_LOG;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.INFRASTRUCTURE_SERVICE;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.INVITATION;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.MODEL;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.NOTIFICATION_LOG;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.ORGANIZATION;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.ORGANIZATION_MEMBER;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.PLUGIN;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.PREDICTION_JOB;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.REVIEW;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.ROLE;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.SCHEMA;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.SCHEMA_BOOKMARK;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.SCHEMA_DRAFT;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.SCHEMA_VERSION;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.STORAGE_OBJECT;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.SYSTEM_ALERT;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.TERMINAL_SESSION;
import static dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType.USER;

/**
 * The one list of what the audit log records, published through OpenAPI as the API's action codes.
 * Each action is done to one kind of target. A new action is a constant here and its label in the
 * frontend, which does not compile without one; {@code AuditCoverageTest} fails on a constant
 * nothing records. A stored code is read back through its constant, so removing an action takes a
 * migration that deletes its rows.
 */
public enum AuditAction {
    ORGANIZATION_CREATE(ORGANIZATION),
    ORGANIZATION_UPDATE(ORGANIZATION),
    ORGANIZATION_DELETE(ORGANIZATION),
    ORGANIZATION_LOGO_REPLACE(ORGANIZATION),
    ORGANIZATION_LOGO_REMOVE(ORGANIZATION),
    OWNERSHIP_TRANSFER(ORGANIZATION),
    MEMBER_ROLE_CHANGE(ORGANIZATION_MEMBER),
    MEMBER_REMOVE(ORGANIZATION_MEMBER),

    INVITATION_CREATE(INVITATION),
    INVITATION_RESEND(INVITATION),
    INVITATION_REVOKE(INVITATION),
    INVITATION_ACCEPT(INVITATION),
    INVITATION_DECLINE(INVITATION),

    ROLE_CREATE(ROLE),
    ROLE_FROM_TEMPLATE(ROLE),
    ROLE_DUPLICATE(ROLE),
    ROLE_UPDATE(ROLE),
    ROLE_DELETE(ROLE),

    API_CLIENT_CREATE(API_CLIENT),
    API_CLIENT_UPDATE(API_CLIENT),
    API_CLIENT_DELETE(API_CLIENT),
    API_KEY_ISSUE(API_CLIENT_KEY),
    API_KEY_REVOKE(API_CLIENT_KEY),
    API_ACCESS_GRANT(API_CLIENT),
    API_ACCESS_REVOKE(API_CLIENT),
    API_CLIENT_SUSPEND(API_CLIENT),
    API_CLIENT_REINSTATE(API_CLIENT),
    API_CALL_LIMIT_SET(ORGANIZATION),

    MODEL_UPLOAD(MODEL),
    MODEL_RENAME(MODEL),
    MODEL_ARCHIVE(MODEL),
    MODEL_RESTORE(MODEL),
    MODEL_ENVIRONMENT_RETRY(MODEL),
    MODEL_DUPLICATE(MODEL),
    MODEL_DELETE(MODEL),
    MODEL_EXPLAIN(MODEL),
    MODEL_PREPARATION_READY(MODEL),
    MODEL_PREPARATION_FAILED(MODEL),

    SCHEMA_CREATE(SCHEMA),
    SCHEMA_RENAME(SCHEMA),
    SCHEMA_ARCHIVE(SCHEMA),
    SCHEMA_RESTORE(SCHEMA),
    SCHEMA_DUPLICATE(SCHEMA),
    SCHEMA_DELETE(SCHEMA),
    SCHEMA_VERSION_CREATE(SCHEMA_VERSION),
    SCHEMA_DRAFT_CREATE(SCHEMA_DRAFT),
    SCHEMA_DRAFT_UPDATE(SCHEMA_DRAFT),
    SCHEMA_DRAFT_MERGE(SCHEMA_DRAFT),
    SCHEMA_DRAFT_PUBLISH(SCHEMA_DRAFT),

    BOOKMARK_CREATE(SCHEMA_BOOKMARK),
    BOOKMARK_MOVE(SCHEMA_BOOKMARK),
    BOOKMARK_UPDATE(SCHEMA_BOOKMARK),
    BOOKMARK_PUBLISH(SCHEMA_BOOKMARK),
    BOOKMARK_UNPUBLISH(SCHEMA_BOOKMARK),
    BOOKMARK_EXAMPLE_MARK(SCHEMA_BOOKMARK),
    BOOKMARK_EXAMPLE_UNMARK(SCHEMA_BOOKMARK),
    BOOKMARK_MODERATION_UNPUBLISH(SCHEMA_BOOKMARK),

    PREDICTION_RUN(SCHEMA_BOOKMARK),
    PREDICTION_RUN_SAVE(AuditTargetType.PREDICTION_RUN),
    PREDICTION_RUN_BATCH_CREATE(SCHEMA_BOOKMARK),
    PREDICTION_RUN_DELETE(AuditTargetType.PREDICTION_RUN),
    PREDICTION_JOB_START(PREDICTION_JOB),
    PREDICTION_JOB_CANCEL(PREDICTION_JOB),
    PREDICTION_JOB_RETRY(PREDICTION_JOB),
    PREDICTION_JOB_CLAIMED(PREDICTION_JOB),
    PREDICTION_JOB_COMPLETED(PREDICTION_JOB),
    PREDICTION_JOB_CANCELLED(PREDICTION_JOB),

    REVIEW_CREATE(REVIEW),
    REVIEW_FEEDBACK_CREATE(REVIEW),
    REVIEW_FEEDBACK_UPDATE(REVIEW),
    REVIEW_SUBMIT(REVIEW),
    REVIEW_SUBMIT_PENDING(ORGANIZATION),
    REVIEW_REOPEN(REVIEW),
    REVIEW_RESPONSE_DELETE(REVIEW),
    PUBLIC_FEEDBACK_SAVE(AuditTargetType.PREDICTION_RUN),

    PLUGIN_UPLOAD(PLUGIN),
    PLUGIN_DELETE(PLUGIN),

    USER_CREATE(USER),
    USER_UPDATE(USER),
    USER_PASSWORD_RESET(USER),
    USER_DELETE(USER),
    USER_PROFILE_UPDATE(USER),
    USER_HANDLE_CHANGE(USER),
    USER_AVATAR_REPLACE(USER),
    USER_AVATAR_REMOVE(USER),
    USER_PASSWORD_CHANGE(USER),
    INFRASTRUCTURE_SERVICE_ACTION(INFRASTRUCTURE_SERVICE),
    TERMINAL_SESSION_OPEN(TERMINAL_SESSION),
    TERMINAL_SESSION_CLOSE(TERMINAL_SESSION),

    AUTH_LOGIN(USER),
    AUTH_LOGIN_FAILED(USER),
    AUTH_LOGOUT(USER),
    AUTH_REGISTER(USER),

    STORAGE_DELETION_FAILED(STORAGE_OBJECT),
    API_REQUEST_RETENTION_PRUNE(API_REQUEST_LOG),
    AUDIT_RETENTION_PRUNE(AUDIT_LOG),
    NOTIFICATION_RETENTION_PRUNE(NOTIFICATION_LOG),
    SYSTEM_ALERT_RAISED(SYSTEM_ALERT),
    SYSTEM_ALERT_ESCALATED(SYSTEM_ALERT),
    SYSTEM_ALERT_RESOLVED(SYSTEM_ALERT),
    SYSTEM_ALERT_RETENTION_PRUNE(SYSTEM_ALERT);

    private final AuditTargetType targetType;

    AuditAction(AuditTargetType targetType) {
        this.targetType = targetType;
    }

    public AuditTargetType targetType() {
        return targetType;
    }
}
