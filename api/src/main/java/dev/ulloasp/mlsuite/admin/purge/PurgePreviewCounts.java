package dev.ulloasp.mlsuite.admin.purge;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/** Real counts of what a purge would destroy, under the names the purge itself counts with. */
@Component
@RequiredArgsConstructor
class PurgePreviewCounts {

    private static final String RUNS = "prediction_run r JOIN versions v ON v.id = r.schema_version_id";
    private static final String RESULTS = RUNS + " JOIN prediction_result x ON x.prediction_run_id = r.id";
    private static final String SNAPSHOT_COUNTS = """
            WITH versions AS (%s) SELECT
                (SELECT count(*) FROM versions) AS "schemaVersions",
                (SELECT count(*) FROM %s) AS "runs",
                (SELECT count(*) FROM %s) AS "results",
                (SELECT count(*) FROM %s JOIN prediction_result_feedback f ON f.prediction_result_id = x.id) AS "answers",
                (SELECT count(*) FROM schema_review sr JOIN versions v ON v.id = sr.schema_version_id) AS "reviews",
                (SELECT count(*) FROM schema_bookmark b JOIN versions v ON v.id = b.schema_version_id) AS "bookmarks",
                (SELECT count(*) FROM schema_draft d JOIN versions v ON v.id = d.base_version_id) AS "drafts",
                (SELECT count(*) FROM prediction_job j JOIN versions v ON v.id = j.schema_version_id) AS "predictionJobs"
            """;
    private static final String ORGANIZATION_COUNTS = """
            SELECT
                (SELECT count(*) FROM schema_artifact WHERE organization_id = :organization) AS "schemas",
                (SELECT count(*) FROM model WHERE organization_id = :organization) AS "models",
                (SELECT count(*) FROM plugin_metadata WHERE organization_id = :organization) AS "plugins",
                (SELECT count(*) FROM organization_membership WHERE organization_id = :organization) AS "memberships",
                (SELECT count(*) FROM invitation WHERE organization_id = :organization) AS "invitations",
                (SELECT count(*) FROM role_definition WHERE organization_id = :organization) AS "roles",
                (SELECT count(*) FROM api_client WHERE organization_id = :organization) AS "apiClients",
                (SELECT count(*) FROM api_request WHERE organization_id = :organization) AS "apiCalls"
            """;

    private final NamedParameterJdbcTemplate jdbc;

    Map<String, Long> count(PurgeTargets.Target target) {
        PurgeScope scope = target.scope();
        var parameters = new MapSqlParameterSource("organization", target.organizationId())
                .addValue("target", target.id());
        Map<String, Long> counts = new LinkedHashMap<>();
        add(counts, SNAPSHOT_COUNTS.formatted(scope.versions(), RUNS, RESULTS, RESULTS), parameters);
        if (scope.ownsOrganization()) {
            add(counts, ORGANIZATION_COUNTS, parameters);
        }
        if (scope == PurgeScope.SCHEMA) {
            counts.put("schemas", 1L);
        }
        if (scope == PurgeScope.MODEL) {
            counts.put("models", 1L);
        }
        return counts;
    }

    private void add(Map<String, Long> counts, String sql, MapSqlParameterSource parameters) {
        jdbc.queryForMap(sql, parameters).forEach((name, value) -> counts.put(name, ((Number) value).longValue()));
    }
}
