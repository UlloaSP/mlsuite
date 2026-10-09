package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
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
    void appliesCompleteHistoryToEmptyPostgresAndIsRepeatable() throws Exception {
        Flyway flyway = flyway("fresh", null);

        assertEquals(12, flyway.migrate().migrationsExecuted);
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals("12", flyway.info().current().getVersion().toString());

        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.prepareStatement("""
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_name = 'model'
                          AND column_name IN ('artifact_sha256', 'artifact_state', 'storage_version_id', 'version')
                        """)) {
            try (var result = statement.executeQuery()) {
                assertTrue(result.next());
                assertEquals(4, result.getInt(1));
            }
        }
    }

    @Test
    void upgradesVersionOneDataWithoutDiscardingInlineArtifacts() throws Exception {
        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA upgrade_path");
            statement.execute("SET search_path TO upgrade_path");
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V1__baseline.sql"));
            statement.execute("""
                    INSERT INTO app_user
                        (username, email, password_hash, full_name, system_role, enabled, created_at, updated_at)
                    VALUES ('legacy', 'legacy@example.test', 'hash', 'Legacy', 'USER', true, now(), now())
                    """);
            statement.execute("""
                    INSERT INTO model
                        (user_id, name, type, specific_type, file_name, model_file, input_schema, created_at, updated_at)
                    VALUES
                        (1, 'inline', 'classifier', 'Legacy', 'inline.bin', decode('0102', 'hex'), '{}', now(), now()),
                        (1, 'stored', 'classifier', 'Legacy', 'stored.bin', decode('', 'hex'), '{}', now(), now())
                    """);
            statement.execute("""
                    UPDATE model
                    SET storage_bucket = 'models', storage_object_key = 'legacy/key'
                    WHERE name = 'stored'
                    """);
            statement.execute("""
                    INSERT INTO organization (slug, name, created_by_user_id, created_at, updated_at)
                    VALUES ('legacy', 'Legacy', 1, now(), now())
                    """);
            statement.execute("""
                    INSERT INTO organization_membership (organization_id, user_id, role, status, created_at, updated_at)
                    VALUES (1, 1, 'OWNER', 'ACTIVE', now(), now())
                    """);
            statement.execute("""
                    INSERT INTO invitation
                        (organization_id, invited_by_user_id, email, role, status, token, expires_at, created_at, updated_at)
                    VALUES (1, 1, 'viewer@example.test', 'VIEWER', 'PENDING', 'legacy-token', now(), now(), now())
                    """);
            statement.execute("""
                    INSERT INTO schema_artifact (organization_id, name, description, created_at, updated_at)
                    VALUES (1, 'Risk', 'Estimates risk.', now(), now()), (1, 'Bare', NULL, now(), now())
                    """);
            statement.execute("""
                    INSERT INTO schema_version (schema_id, version_number, form_schema_json, created_at)
                    VALUES (1, 1, '{}', now()), (2, 1, '{}', now())
                    """);
            statement.execute("""
                    INSERT INTO schema_bookmark (schema_id, schema_version_id, name, created_at, updated_at)
                    VALUES (1, 1, 'production', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
                           (1, 1, 'staging', now(), now()),
                           (2, 2, 'draft', now(), now())
                    """);
        }

        Flyway upgraded = Flyway.configure()
                .configuration(postgresFlywaySettings())
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .defaultSchema("upgrade_path")
                .schemas("upgrade_path")
                .baselineOnMigrate(true)
                .baselineVersion(MigrationVersion.fromVersion("1"))
                .load();
        assertEquals(11, upgraded.migrate().migrationsExecuted);

        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement();
                var result = statement.executeQuery("""
                        SELECT name, artifact_state, octet_length(model_file)
                        FROM upgrade_path.model
                        ORDER BY name
                        """)) {
            assertTrue(result.next());
            assertEquals("inline", result.getString(1));
            assertEquals("INLINE_ONLY", result.getString(2));
            assertEquals(2, result.getInt(3));
            assertTrue(result.next());
            assertEquals("stored", result.getString(1));
            assertEquals("UNVERIFIED", result.getString(2));
            assertEquals(0, result.getInt(3));
        }
        assertLegacyRoleBackfilled("organization_membership", "OWNER", 22);
        assertLegacyRoleBackfilled("invitation", "VIEWER", 4);
        assertPublishPermissionIsStorable();
        assertBookmarksTookTheirSchemaDescription();
        assertExamplesLeaveWithTheirRunOrBookmark();
    }

    /** V9: a bookmark that existed takes its schema's description once, and is not otherwise touched. */
    private void assertBookmarksTookTheirSchemaDescription() throws Exception {
        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement();
                var result = statement.executeQuery("""
                        SELECT name, description, updated_at = '2026-01-01T00:00:00Z'
                        FROM upgrade_path.schema_bookmark
                        ORDER BY id
                        """)) {
            assertTrue(result.next());
            assertEquals("production", result.getString(1));
            assertEquals("Estimates risk.", result.getString(2));
            assertTrue(result.getBoolean(3));
            assertTrue(result.next());
            assertEquals("Estimates risk.", result.getString(2));
            assertTrue(result.next());
            assertEquals("draft", result.getString(1));
            assertNull(result.getString(2));
        }
    }

    /**
     * V8: deleting a run or a bookmark takes its example rows along, so none is orphaned.
     * The schema and its bookmarks are the ones seeded before the upgrade.
     */
    private void assertExamplesLeaveWithTheirRunOrBookmark() throws Exception {
        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("SET search_path TO upgrade_path");
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

    private int exampleRows(Statement statement) throws Exception {
        try (var result = statement.executeQuery("SELECT COUNT(*) FROM schema_bookmark_example")) {
            assertTrue(result.next());
            return result.getInt(1);
        }
    }

    /** V7 widens the permission checks; existing bookmarks stay private. */
    private void assertPublishPermissionIsStorable() throws Exception {
        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            assertEquals(2, statement.executeUpdate("""
                    INSERT INTO upgrade_path.role_permission (role_definition_id, permission_key)
                    SELECT id, 'PUBLISH_BOOKMARKS' FROM upgrade_path.role_definition
                    """));
            try (var result = statement.executeQuery("""
                    SELECT column_default, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'upgrade_path' AND table_name = 'schema_bookmark'
                      AND column_name = 'visibility'
                    """)) {
                assertTrue(result.next());
                assertTrue(result.getString(1).startsWith("'PRIVATE'"));
                assertEquals("NO", result.getString(2));
            }
        }
    }

    private void assertLegacyRoleBackfilled(String table, String systemKey, int permissions) throws Exception {
        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement();
                var result = statement.executeQuery("""
                        SELECT definition.system_key,
                               (SELECT COUNT(*) FROM upgrade_path.role_permission permission
                                WHERE permission.role_definition_id = definition.id)
                        FROM upgrade_path.%s assignment
                        JOIN upgrade_path.role_definition definition ON definition.id = assignment.role_definition_id
                        """.formatted(table));
                var legacyColumn = connection.getMetaData().getColumns(null, "upgrade_path", table, "role")) {
            assertTrue(result.next());
            assertEquals(systemKey, result.getString(1));
            assertEquals(permissions, result.getInt(2));
            assertFalse(legacyColumn.next());
        }
    }

    private Flyway flyway(String schema, MigrationVersion target) {
        var configuration = Flyway.configure()
                .configuration(postgresFlywaySettings())
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .defaultSchema(schema)
                .schemas(schema)
                .createSchemas(true)
                .cleanDisabled(true);
        if (target != null) {
            configuration.target(target);
        }
        return configuration.load();
    }

    private Map<String, String> postgresFlywaySettings() {
        return Map.of("flyway.postgresql.transactional.lock", "false");
    }
}
