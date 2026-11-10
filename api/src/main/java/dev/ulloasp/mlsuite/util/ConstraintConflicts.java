package dev.ulloasp.mlsuite.util;

import java.util.Map;
import java.util.Optional;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

/**
 * What a request is told when the database refuses it. Uniqueness, "this belongs to that" and
 * "still in use" are decided by the database's own constraints, not by checking first, so two
 * requests racing for the same name, or a write naming a row of another schema, end the same way:
 * the constraint that refused the write names the conflict.
 *
 * <p>A foreign key refuses two different things, told apart by PostgreSQL's message: a row written
 * to point at a parent it may not have (the request is wrong: 400), and a parent deleted while rows
 * still point at it (it is in use: 409).
 */
public final class ConstraintConflicts {

    /** The answer a refused write gets. */
    public record Conflict(HttpStatus status, String message) {
    }

    private static final String HANDLE = "That handle was just taken.";
    private static final String MODEL_IN_USE = "Model is used by schemas or prediction runs. Archive it instead.";
    private static final String RUNS_KEEP_IT =
            "Prediction runs were made on this schema, so it stays while they do. Archive it instead.";

    /** Unique keys, and parents deleted while still referenced. */
    private static final Map<String, String> IN_USE = Map.ofEntries(
            Map.entry("uq_app_user_username", HANDLE),
            Map.entry("uq_organization_slug", HANDLE),
            Map.entry("uq_app_user_email_lower", "An account already exists with this email."),
            Map.entry("uq_model_name_org", "This organization already has a model with this name."),
            Map.entry("uq_schema_org_name", "Schema name already exists"),
            Map.entry("uq_api_client_organization_name", "This organization already has a client with this name."),
            Map.entry("uq_invitation_pending_email", "This address already has a pending invitation."),
            Map.entry("uq_prediction_result_attestation",
                    "This prediction was already saved in a run; run the inference again to save another."),
            Map.entry("fk_schema_binding_model", MODEL_IN_USE),
            Map.entry("fk_prediction_run_version", RUNS_KEEP_IT),
            // A snapshot's bindings and plugin pins go with it, and refuse to while runs were made on it.
            Map.entry("ck_schema_binding_fixed", RUNS_KEEP_IT),
            Map.entry("ck_schema_version_plugin_fixed", RUNS_KEEP_IT),
            Map.entry("fk_schema_review_schema", "A review is built on this schema; delete the review first."),
            Map.entry("fk_schema_review_version", "A review is built on this snapshot; delete the review first."),
            Map.entry("fk_schema_version_plugin_plugin",
                    "Published snapshots render with this plugin, so it stays while they do."),
            Map.entry("uq_role_definition_org_name", "This organization already has a role with this name."),
            Map.entry("uq_schema_bookmark_schema_name", "This schema already has a bookmark with this name."),
            Map.entry("uq_schema_version_schema_name", "A snapshot of this schema already has this name."));

    /** Rows written to point outside the schema or snapshot they belong to. */
    private static final Map<String, String> MISPLACED = Map.ofEntries(
            Map.entry("fk_schema_bookmark_version", "Bookmark version outside schema"),
            Map.entry("fk_schema_draft_base", "Base version outside schema"),
            Map.entry("fk_schema_bookmark_example_run", "Run outside the bookmark's schema"),
            Map.entry("fk_schema_review_version", "Schema snapshot unavailable"),
            Map.entry("fk_schema_review_run_prediction", "Prediction run unavailable"),
            Map.entry("fk_api_client_bookmark_schema", "Bookmark outside the client's organization"),
            Map.entry("fk_prediction_job_version", "Version outside the bookmark's schema"),
            Map.entry("fk_prediction_result_binding", "Model not bound to the run's snapshot"),
            Map.entry("fk_result_feedback_review_run", "Run outside the review"),
            Map.entry("fk_review_assignee_member", "Reviewer is not a member of the organization"),
            Map.entry("fk_schema_review_submission_assignee", "Reviewer is not assigned to the review"));

    private ConstraintConflicts() {
    }

    /** The conflict the refusing constraint names, if it is one a person can act on. */
    public static Optional<Conflict> of(DataIntegrityViolationException ex) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation && violation.getConstraintName() != null) {
                String name = violation.getConstraintName();
                if (pointsAtAMissingParent(violation) && MISPLACED.containsKey(name)) {
                    return Optional.of(new Conflict(HttpStatus.BAD_REQUEST, MISPLACED.get(name)));
                }
                if (name.startsWith("ck_") && name.endsWith("_not_purging")) {
                    return Optional.of(new Conflict(HttpStatus.CONFLICT, "It is being deleted; nothing new is added to it."));
                }
                if (name.startsWith("ck_") && name.endsWith("_present")) {
                    return Optional.of(new Conflict(HttpStatus.BAD_REQUEST, "A name cannot be blank."));
                }
                return Optional.ofNullable(IN_USE.get(name)).map(message -> new Conflict(HttpStatus.CONFLICT, message));
            }
        }
        return Optional.empty();
    }

    /** Whether this constraint refused the write, for a caller that answers it in its own words. */
    public static boolean refusedBy(DataIntegrityViolationException ex, String constraint) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation) {
                return constraint.equals(violation.getConstraintName());
            }
        }
        return false;
    }

    /** PostgreSQL says "insert or update on table ..." when the written row is the one pointing. */
    private static boolean pointsAtAMissingParent(ConstraintViolationException violation) {
        String message = String.valueOf(violation.getSQLException() == null ? null : violation.getSQLException().getMessage());
        return message.contains("insert or update on table");
    }
}
