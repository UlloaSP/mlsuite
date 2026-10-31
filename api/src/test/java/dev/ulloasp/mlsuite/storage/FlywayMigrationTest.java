package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class FlywayMigrationTest {

    @Container
    final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    @Test
    void appliesTheBaselineToAnEmptyDatabaseAndIsRepeatable() throws Exception {
        Flyway flyway = flyway("fresh");

        assertEquals(flyway.info().pending().length, flyway.migrate().migrationsExecuted);
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals("4", flyway.info().current().getVersion().toString());

        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("SET search_path TO fresh, public");
            try (var result = statement.executeQuery("""
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_schema = 'fresh' AND table_name = 'model' AND is_nullable = 'NO'
                      AND column_name IN ('organization_id', 'storage_bucket', 'storage_object_key',
                                          'storage_version_id', 'storage_etag', 'model_size_bytes',
                                          'artifact_sha256', 'artifact_verified_at')
                    """)) {
                assertTrue(result.next());
                assertEquals(8, result.getInt(1));
            }
            try (var result = statement.executeQuery("""
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_schema = 'fresh' AND table_name = 'model'
                      AND (column_name = 'model_file' OR column_name LIKE 'artifact_migration%'
                           OR column_name = 'artifact_state')
                    """)) {
                assertTrue(result.next());
                assertEquals(0, result.getInt(1));
            }
            // A bundle without a lock runs in the legacy environment, which only this row describes.
            try (var result = statement.executeQuery("""
                    SELECT writer_version, jsonb_array_length(packages), packages @> '[{"name": "xgboost"}]'
                    FROM runtime_environment WHERE environment_key = 'legacy'
                    """)) {
                assertTrue(result.next());
                assertEquals("0.2.1", result.getString(1));
                assertEquals(37, result.getInt(2));
                assertTrue(result.getBoolean(3));
                assertFalse(result.next());
            }
        }
    }

    @Test
    void aModelCannotExistWithoutAVerifiedStoredArtifact() throws Exception {
        flyway("identity").migrate();
        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("SET search_path TO identity, public");
            seedOrganization(statement);
            String columns = """
                    (organization_id, user_id, name, type, specific_type, file_name, storage_bucket,
                     storage_object_key, storage_version_id, storage_etag, model_size_bytes, artifact_sha256,
                     artifact_verified_at, input_schema, environment_key, runtime_state, created_at, updated_at)
                    """;
            String values = """
                    (1, 1, 'risk', 'classifier', 'Forest', 'risk.mlbundle', 'bucket', 'key', 'v1', 'etag', 5,
                     %s, now(), '{}', 'legacy', 'READY', now(), now())
                    """;
            statement.execute("INSERT INTO model " + columns + " VALUES "
                    + values.formatted("repeat('a', 64)"));

            assertEquals("23502", assertThrows(SQLException.class, () -> statement.execute(
                    "INSERT INTO model " + columns + " VALUES " + values.formatted("NULL"))).getSQLState());
            assertEquals("23514", assertThrows(SQLException.class, () -> statement.execute(
                    "INSERT INTO model " + columns + " VALUES " + values.formatted("'not-a-digest'"))).getSQLState());
        }
    }

    @Test
    void examplesLeaveWithTheirRunOrBookmark() throws Exception {
        flyway("examples").migrate();
        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("SET search_path TO examples, public");
            seedOrganization(statement);
            statement.execute("""
                    INSERT INTO schema_artifact (organization_id, name, created_at, updated_at)
                    VALUES (1, 'Risk', now(), now())
                    """);
            statement.execute("""
                    INSERT INTO schema_version (schema_id, version_number, form_schema_json, created_at)
                    VALUES (1, 1, '{}', now())
                    """);
            statement.execute("""
                    INSERT INTO schema_bookmark (schema_id, schema_version_id, name, created_at, updated_at)
                    VALUES (1, 1, 'production', now(), now()), (1, 1, 'staging', now(), now())
                    """);
            statement.execute("""
                    INSERT INTO prediction_run
                        (schema_version_id, schema_bookmark_id, name, input_data_json, status, origin, created_at, updated_at)
                    VALUES (1, 1, 'first', '{}', 'SUCCESS', 'WORKSPACE', now(), now()),
                           (1, NULL, 'second', '{}', 'SUCCESS', 'WORKSPACE', now(), now())
                    """);
            statement.execute("""
                    INSERT INTO schema_bookmark_example (schema_bookmark_id, prediction_run_id, public_id, created_at)
                    VALUES (1, 1, 'example-1', now()), (1, 2, 'example-2', now()), (2, 2, 'example-3', now())
                    """);

            statement.execute("DELETE FROM prediction_run WHERE id = 2");
            assertEquals(1, exampleRows(statement));
            statement.execute("UPDATE prediction_run SET schema_bookmark_id = NULL");
            statement.execute("DELETE FROM schema_bookmark WHERE id = 1");
            assertEquals(0, exampleRows(statement));
        }
    }

    private void seedOrganization(Statement statement) throws SQLException {
        statement.execute("""
                INSERT INTO app_user
                    (username, email, password_hash, full_name, system_role, enabled, created_at, updated_at)
                VALUES ('owner', 'owner@example.test', 'hash', 'Owner', 'USER', true, now(), now())
                """);
        statement.execute("""
                INSERT INTO organization (slug, name, created_by_user_id, created_at, updated_at)
                VALUES ('owner', 'Owner', 1, now(), now())
                """);
    }

    private int exampleRows(Statement statement) throws SQLException {
        try (var result = statement.executeQuery("SELECT COUNT(*) FROM schema_bookmark_example")) {
            assertTrue(result.next());
            return result.getInt(1);
        }
    }

    private Flyway flyway(String schema) {
        return Flyway.configure()
                .configuration(Map.of("flyway.postgresql.transactional.lock", "false"))
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .defaultSchema(schema)
                .schemas(schema)
                .createSchemas(true)
                .cleanDisabled(true)
                .load();
    }
}
