package dev.ulloasp.mlsuite.apiaccess;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.DriverManager;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** V16 turns the bookmark keys an instance already issued into API clients. */
@Testcontainers(disabledWithoutDocker = true)
class ApiClientMigrationTest {

    @Container
    final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    /**
     * The keys an organization issued under one consumer name become one client, which may
     * run each of their bookmarks; every key keeps its secret, and a bookmark that was never
     * published gets the id clients call it by.
     */
    @Test
    void bookmarkKeysBecomeClientsThatKeepTheirSecrets() throws Exception {
        flyway("keys", MigrationVersion.fromVersion("15")).migrate();
        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("SET search_path TO keys");
            statement.execute("""
                    INSERT INTO app_user (username, email, password_hash, full_name, system_role, enabled, created_at, updated_at)
                    VALUES ('owner', 'owner@example.test', 'hash', 'Owner', 'USER', true, now(), now());
                    INSERT INTO organization (slug, name, created_by_user_id, created_at, updated_at)
                    VALUES ('acme', 'Acme', 1, now(), now()), ('other', 'Other', 1, now(), now());
                    INSERT INTO schema_artifact (organization_id, name, created_at, updated_at)
                    VALUES (1, 'Risk', now(), now()), (2, 'Risk', now(), now());
                    INSERT INTO schema_version (schema_id, version_number, form_schema_json, created_at)
                    VALUES (1, 1, '{}', now()), (2, 1, '{}', now());
                    INSERT INTO schema_bookmark (schema_id, schema_version_id, name, visibility, public_id, created_at, updated_at)
                    VALUES (1, 1, 'production', 'PUBLIC', 'pub-1', now(), now()),
                           (1, 1, 'staging', 'PRIVATE', NULL, now(), now()),
                           (2, 2, 'production', 'PUBLIC', 'pub-2', now(), now());
                    INSERT INTO bookmark_api_key (schema_bookmark_id, name, key_prefix, key_hash, created_by_name, created_at, last_used_at)
                    VALUES (1, 'Lab2Pressure', 'mls_aaaaaaaa', repeat('a', 64), 'Ada', '2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z'),
                           (2, 'lab2pressure', 'mls_bbbbbbbb', repeat('b', 64), 'Bob', '2026-10-03T00:00:00Z', NULL),
                           (1, 'Edge', 'mls_cccccccc', repeat('c', 64), 'Ada', now(), NULL),
                           (3, 'Lab2Pressure', 'mls_dddddddd', repeat('d', 64), 'Eve', now(), NULL);
                    """);
        }

        assertEquals(1, flyway("keys", null).migrate().migrationsExecuted);

        try (var connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("SET search_path TO keys");
            try (var result = statement.executeQuery("""
                    SELECT c.organization_id, c.name, c.created_by_name, c.status,
                           (SELECT string_agg(k.key_hash || ':' || k.name, ',' ORDER BY k.key_hash)
                            FROM api_client_key k WHERE k.api_client_id = c.id),
                           (SELECT string_agg(b.name, ',' ORDER BY b.name)
                            FROM api_client_bookmark g JOIN schema_bookmark b ON b.id = g.schema_bookmark_id
                            WHERE g.api_client_id = c.id)
                    FROM api_client c ORDER BY c.organization_id, lower(c.name)
                    """)) {
                assertTrue(result.next());
                assertEquals("Edge", result.getString(2));
                assertEquals("c".repeat(64) + ":production", result.getString(5));
                assertTrue(result.next());
                assertEquals(1, result.getInt(1));
                assertEquals("Lab2Pressure", result.getString(2));
                assertEquals("Ada", result.getString(3));
                assertEquals("ACTIVE", result.getString(4));
                assertEquals("a".repeat(64) + ":production," + "b".repeat(64) + ":staging", result.getString(5));
                assertEquals("production,staging", result.getString(6));
                assertTrue(result.next());
                assertEquals(2, result.getInt(1));
                assertEquals("d".repeat(64) + ":production", result.getString(5));
                assertFalse(result.next());
            }
            try (var result = statement.executeQuery("""
                    SELECT public_id FROM schema_bookmark WHERE name = 'staging'
                    """)) {
                assertTrue(result.next());
                assertNotNull(result.getString(1));
            }
            try (var result = statement.executeQuery("SELECT to_regclass('keys.bookmark_api_key')")) {
                assertTrue(result.next());
                assertNull(result.getString(1));
            }
        }
    }

    private Flyway flyway(String schema, MigrationVersion target) {
        var configuration = Flyway.configure()
                .configuration(Map.of("flyway.postgresql.transactional.lock", "false"))
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
}
