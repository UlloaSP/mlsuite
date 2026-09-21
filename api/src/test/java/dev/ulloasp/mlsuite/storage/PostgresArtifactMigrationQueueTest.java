package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class PostgresArtifactMigrationQueueTest {

    private static final String SCHEMA = "artifact_queue";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.11-alpine3.24")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    private static JdbcTemplate jdbc;
    private static PostgresArtifactMigrationQueue queue;

    @BeforeAll
    static void migrate() {
        Flyway.configure()
                .configuration(Map.of("flyway.postgresql.transactional.lock", "false"))
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .defaultSchema(SCHEMA)
                .schemas(SCHEMA)
                .createSchemas(true)
                .load()
                .migrate();
        PGSimpleDataSource dataSource = new PGSimpleDataSource();
        dataSource.setUrl(POSTGRES.getJdbcUrl());
        dataSource.setCurrentSchema(SCHEMA);
        dataSource.setUser(POSTGRES.getUsername());
        dataSource.setPassword(POSTGRES.getPassword());
        jdbc = new JdbcTemplate(dataSource);
        queue = new PostgresArtifactMigrationQueue(jdbc);
    }

    @Test
    void anExpiredLeaseIsReclaimedWithANewFencingToken() {
        jdbc.update("TRUNCATE model, app_user RESTART IDENTITY CASCADE");
        jdbc.update("""
                INSERT INTO app_user
                    (username, email, password_hash, full_name, system_role, enabled, created_at, updated_at)
                VALUES ('owner', 'owner@example.test', 'hash', 'Owner', 'USER', true, now(), now())
                """);
        jdbc.update("""
                INSERT INTO model
                    (user_id, name, type, specific_type, file_name, model_file, input_schema,
                     artifact_state, created_at, updated_at, version)
                VALUES (1, 'model', 'classifier', 'Test', 'model.bin', decode('01', 'hex'), '{}',
                        'INLINE_ONLY', now(), now(), 0)
                """);

        var first = queue.claim(1, 5, 300, "lease-a").getFirst();
        jdbc.update("UPDATE model SET artifact_migration_started_at = now() - interval '10 minutes' WHERE id = ?",
                first.id());
        var reclaimed = queue.claim(1, 5, 300, "lease-b").getFirst();

        assertEquals(first.id(), reclaimed.id());
        assertEquals("lease-b", reclaimed.leaseToken());
        assertEquals("lease-b", jdbc.queryForObject(
                "SELECT artifact_migration_worker FROM model WHERE id = ?", String.class, first.id()));
        assertEquals(2, jdbc.queryForObject(
                "SELECT artifact_migration_attempts FROM model WHERE id = ?", Integer.class, first.id()));
    }
}
