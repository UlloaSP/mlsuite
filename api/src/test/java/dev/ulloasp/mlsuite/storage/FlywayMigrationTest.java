package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.DriverManager;
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

        assertEquals(5, flyway.migrate().migrationsExecuted);
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals("5", flyway.info().current().getVersion().toString());

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
        }

        Flyway upgraded = Flyway.configure()
                .configuration(postgresFlywaySettings())
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .defaultSchema("upgrade_path")
                .schemas("upgrade_path")
                .baselineOnMigrate(true)
                .baselineVersion(MigrationVersion.fromVersion("1"))
                .load();
        assertEquals(4, upgraded.migrate().migrationsExecuted);

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
