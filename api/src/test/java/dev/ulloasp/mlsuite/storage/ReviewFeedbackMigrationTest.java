package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * V19 scopes the answers already given to the reviews they were given for and starts their
 * history, losing none: a reviewer's answer on a run under two of their reviews stays in both, an
 * answer by someone reviewing none of the run's reviews stays outside reviews, and every answer
 * kept gets a first revision.
 */
@Testcontainers(disabledWithoutDocker = true)
class ReviewFeedbackMigrationTest {

    @Container
    final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    @Test
    void existingAnswersStayInEachOfTheirReviewsAndStartTheirHistory() throws Exception {
        flyway(MigrationVersion.fromVersion("18")).migrate();
        try (Connection connection = connect(); var statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO app_user (username, email, password_hash, full_name, system_role, enabled,
                        created_at, updated_at)
                    VALUES ('reviewer', 'reviewer@example.test', 'h', 'Reviewer', 'USER', true, now(), now()),
                           ('visitorish', 'other@example.test', 'h', 'Other', 'USER', true, now(), now());
                    INSERT INTO organization (slug, name, created_by_user_id, created_at, updated_at)
                    VALUES ('lab', 'Lab', 1, now(), now());
                    INSERT INTO schema_artifact (organization_id, name, created_at, updated_at)
                    VALUES (1, 'Risk', now(), now());
                    INSERT INTO schema_version (schema_id, version_number, form_schema_json, created_at)
                    VALUES (1, 1, '{}', now());
                    INSERT INTO model (user_id, organization_id, name, type, specific_type, file_name, model_file,
                        input_schema, artifact_state, created_at, updated_at)
                    VALUES (1, 1, 'forest', 'classifier', 'Forest', 'f.mlbundle', decode('01', 'hex'), '{}',
                        'INLINE_ONLY', now(), now());
                    INSERT INTO prediction_run (schema_version_id, name, status, origin, input_data_json, created_at,
                        updated_at)
                    VALUES (1, 'case-1', 'SUCCESS', 'WORKSPACE', '{}', now(), now());
                    INSERT INTO prediction_result (prediction_run_id, model_id, status, model_input_json,
                        output_json, created_at)
                    VALUES (1, 1, 'SUCCESS', '{}', '{}', now());
                    INSERT INTO schema_review (organization_id, schema_id, schema_version_id, created_by_user_id,
                        public_id, expires_at, created_at, updated_at)
                    VALUES (1, 1, 1, 1, 'review-a', now() + interval '7 days', now(), now()),
                           (1, 1, 1, 1, 'review-b', now() + interval '7 days', now(), now());
                    INSERT INTO schema_review_run (schema_review_id, prediction_run_id, public_id)
                    VALUES (1, 1, 'run-a'), (2, 1, 'run-b');
                    INSERT INTO schema_review_assignee (review_id, user_id) VALUES (1, 1), (2, 1);
                    INSERT INTO prediction_result_feedback (prediction_result_id, user_id, feedback_type, orden,
                        data_value, created_at, updated_at)
                    VALUES (1, 1, 'OUTPUT', 0, '{"answer":"high"}', now(), now()),
                           (1, 2, 'OUTPUT', 0, '{"answer":"low"}', now(), now());
                    """);
        }

        assertEquals(1, flyway(null).migrate().migrationsExecuted);

        assertEquals(List.of("1:1:{\"answer\": \"high\"}", "1:2:{\"answer\": \"high\"}", "2:null:{\"answer\": \"low\"}"),
                rows("""
                        SELECT user_id || ':' || coalesce(schema_review_id::text, 'null') || ':' || data_value::text
                        FROM prediction_result_feedback ORDER BY user_id, schema_review_id
                        """));
        assertEquals(List.of("CREATED:1", "CREATED:1", "CREATED:2"), rows("""
                SELECT change || ':' || user_id FROM prediction_result_feedback_revision ORDER BY user_id, id
                """));
    }

    private List<String> rows(String sql) throws Exception {
        List<String> rows = new ArrayList<>();
        try (Connection connection = connect(); var statement = connection.createStatement();
                var result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(result.getString(1));
        }
        return rows;
    }

    private Connection connect() throws Exception {
        Connection connection = DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword());
        connection.createStatement().execute("SET search_path TO migrated");
        return connection;
    }

    private Flyway flyway(MigrationVersion target) {
        var configuration = Flyway.configure()
                .configuration(Map.of("flyway.postgresql.transactional.lock", "false"))
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .defaultSchema("migrated")
                .schemas("migrated")
                .createSchemas(true)
                .cleanDisabled(true);
        if (target != null) configuration.target(target);
        return configuration.load();
    }
}
