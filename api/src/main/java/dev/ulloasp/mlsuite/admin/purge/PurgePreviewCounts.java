package dev.ulloasp.mlsuite.admin.purge;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.service.AccountDeletionRules;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * Real counts of what a purge would remove: each counter its steps add to, choosing rows as their
 * statements do ({@link PurgeSteps}, {@link PurgeMemberSteps}, {@link PurgeBlobSteps} and
 * {@link PurgeAccountSteps}), so a finished purge reports what its preview said.
 */
@Component
@RequiredArgsConstructor
class PurgePreviewCounts {

    private static final String SNAPSHOT_COUNTS = """
            WITH versions AS (%s),
            jobs AS (SELECT id FROM prediction_job WHERE schema_version_id IN (SELECT id FROM versions)),
            reviews AS (SELECT id FROM schema_review WHERE schema_version_id IN (SELECT id FROM versions)),
            review_runs AS (SELECT id FROM schema_review_run WHERE schema_review_id IN (SELECT id FROM reviews)),
            runs AS (SELECT id FROM prediction_run WHERE schema_version_id IN (SELECT id FROM versions)),
            results AS (SELECT id FROM prediction_result WHERE prediction_run_id IN (SELECT id FROM runs)),
            bookmarks AS (SELECT id FROM schema_bookmark WHERE schema_version_id IN (SELECT id FROM versions))
            SELECT
                (SELECT count(*) FROM prediction_job WHERE status IN ('QUEUED', 'RUNNING')
                    AND (schema_version_id IN (SELECT id FROM versions)%s)) AS "predictionJobsCancelled",
                (SELECT count(*) FROM prediction_job_row WHERE prediction_job_id IN (SELECT id FROM jobs))
                    AS "predictionJobRows",
                (SELECT count(*) FROM jobs) AS "predictionJobs",
                (SELECT count(*) FROM prediction_result_feedback_revision
                    WHERE schema_version_id IN (SELECT id FROM versions)) AS "answerHistory",
                (SELECT count(*) FROM prediction_result_feedback
                    WHERE prediction_result_id IN (SELECT id FROM results)) AS "answers",
                (SELECT count(*) FROM schema_review_run_submission
                    WHERE schema_review_run_id IN (SELECT id FROM review_runs)) AS "reviewSubmissions",
                (SELECT count(*) FROM review_runs) AS "reviewRuns",
                (SELECT count(*) FROM schema_review_assignee WHERE schema_review_id IN (SELECT id FROM reviews))
                    AS "reviewAssignees",
                (SELECT count(*) FROM reviews) AS "reviews",
                (SELECT count(*) FROM results) AS "results",
                (SELECT count(*) FROM runs) AS "runs",
                (SELECT count(*) FROM schema_model_binding WHERE schema_version_id IN (SELECT id FROM versions))
                    AS "bindings",
                (SELECT count(*) FROM schema_bookmark_example WHERE schema_bookmark_id IN (SELECT id FROM bookmarks))
                    AS "examples",
                (SELECT count(*) FROM bookmarks) AS "bookmarks",
                (SELECT count(*) FROM schema_draft WHERE base_version_id IN (SELECT id FROM versions)
                    OR published_version_id IN (SELECT id FROM versions)) AS "drafts",
                (SELECT count(*) FROM versions) AS "schemaVersions"
            """;
    private static final String USER_JOBS =
            " OR created_by_principal_id = (SELECT id FROM principal WHERE user_id = :target)";
    private static final String ORGANIZATION_COUNTS = """
            SELECT
                (SELECT count(*) FROM schema WHERE organization_id = :organization) AS "schemas",
                (SELECT count(*) FROM model WHERE organization_id = :organization) AS "models",
                (SELECT count(*) FROM plugin_metadata WHERE organization_id = :organization) AS "plugins",
                (SELECT count(*) FROM api_request WHERE organization_id = :organization) AS "apiCalls",
                (SELECT count(*) FROM api_client WHERE organization_id = :organization) AS "apiClients",
                (SELECT count(*) FROM invitation WHERE organization_id = :organization) AS "invitations",
                (SELECT count(*) FROM organization_membership WHERE organization_id = :organization) AS "memberships",
                (SELECT count(*) FROM app_user WHERE current_organization_id = :organization) AS "selections",
                (SELECT count(*) FROM role_permission WHERE role_definition_id IN (
                    SELECT id FROM role_definition WHERE organization_id = :organization)) AS "rolePermissions",
                (SELECT count(*) FROM role_definition WHERE organization_id = :organization) AS "roles"
            """;
    /** What a person leaves in other organizations; an empty team goes whole, with its rows. */
    private static final String ACCOUNT_COUNTS = """
            SELECT
                (SELECT count(*) FROM invitation WHERE (lower(email) = lower(:email)
                    OR (created_by_principal_id = (SELECT id FROM principal WHERE user_id = :target)
                        AND status = 'REVOKED'))
                    AND organization_id <> :organization%1$s) AS "invitations",
                (SELECT count(*) FROM organization_membership WHERE user_id = :target
                    AND organization_id <> :organization%1$s) AS "memberships"
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final UserRepository users;
    private final AccountDeletionRules accountRules;

    Map<String, Long> count(PurgeTargets.Target target) {
        PurgeScope scope = target.scope();
        var parameters = new MapSqlParameterSource("organization", target.organizationId())
                .addValue("target", target.id());
        Map<String, Long> counts = new LinkedHashMap<>();
        add(counts, SNAPSHOT_COUNTS.formatted(scope.versions(), scope == PurgeScope.USER ? USER_JOBS : ""), parameters);
        if (scope.ownsOrganization()) {
            add(counts, ORGANIZATION_COUNTS, parameters);
        }
        if (scope == PurgeScope.USER) {
            account(counts, parameters, users.findById(target.id()).orElseThrow());
        }
        if (scope == PurgeScope.SCHEMA) {
            counts.put("schemas", 1L);
        }
        if (scope == PurgeScope.MODEL) {
            counts.put("models", 1L);
        }
        return counts;
    }

    private void account(Map<String, Long> counts, MapSqlParameterSource parameters, User user) {
        List<Long> emptyTeams = accountRules.emptyTeams(user).stream().map(Organization::getId).toList();
        counts.put("emptyOrganizations", (long) emptyTeams.size());
        parameters.addValue("email", user.getEmail()).addValue("emptyTeams", emptyTeams);
        add(counts, ACCOUNT_COUNTS.formatted(emptyTeams.isEmpty() ? "" : " AND organization_id NOT IN (:emptyTeams)"),
                parameters);
    }

    /** Counters two phases add to, such as a user's memberships here and elsewhere, add up. */
    private void add(Map<String, Long> counts, String sql, MapSqlParameterSource parameters) {
        jdbc.queryForMap(sql, parameters)
                .forEach((name, value) -> counts.merge(name, ((Number) value).longValue(), Long::sum));
    }
}
