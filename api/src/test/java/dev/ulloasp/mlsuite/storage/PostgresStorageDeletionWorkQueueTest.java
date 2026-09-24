package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class PostgresStorageDeletionWorkQueueTest {

    private static final String SCHEMA = "deletion_queue";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    private static JdbcTemplate jdbc;
    private static PostgresStorageDeletionWorkQueue queue;

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
        queue = new PostgresStorageDeletionWorkQueue(jdbc);
    }

    @Test
    void workersClaimDisjointBatchesAndExpiredLeasesAreFenced() {
        jdbc.update("TRUNCATE storage_deletion_task RESTART IDENTITY");
        for (int index = 1; index <= 3; index++) {
            jdbc.update("INSERT INTO storage_deletion_task (bucket, object_key) VALUES ('models', ?)", "key-" + index);
        }

        var firstClaim = queue.claim(2, 300, "worker-a");
        var secondClaim = queue.claim(2, 300, "worker-b");

        assertEquals(2, firstClaim.size());
        assertEquals(1, secondClaim.size());
        Set<Long> firstIds = firstClaim.stream().map(StorageDeletionWorkItem::id).collect(Collectors.toSet());
        Set<Long> secondIds = secondClaim.stream().map(StorageDeletionWorkItem::id).collect(Collectors.toSet());
        assertEquals(Set.of(), firstIds.stream().filter(secondIds::contains).collect(Collectors.toSet()));

        jdbc.update("UPDATE storage_deletion_task SET processing_started_at = now() - interval '10 minutes' WHERE id = ?",
                firstClaim.getFirst().id());
        var reclaimed = queue.claim(1, 300, "worker-b").getFirst();
        assertEquals(firstClaim.getFirst().id(), reclaimed.id());

        queue.complete(reclaimed.id(), "worker-a");
        assertEquals("RUNNING", jdbc.queryForObject(
                "SELECT status FROM storage_deletion_task WHERE id = ?", String.class, reclaimed.id()));
        queue.complete(reclaimed.id(), "worker-b");
        assertEquals("COMPLETED", jdbc.queryForObject(
                "SELECT status FROM storage_deletion_task WHERE id = ?", String.class, reclaimed.id()));
    }

    @Test
    void failuresBackOffUntilTheAttemptLimitAndRejectAnExpiredToken() {
        jdbc.update("TRUNCATE storage_deletion_task RESTART IDENTITY");
        jdbc.update("INSERT INTO storage_deletion_task (bucket, object_key) VALUES ('models', 'retry-me')");

        var firstClaim = queue.claim(1, 300, "first-token").getFirst();
        queue.fail(firstClaim.id(), "wrong-token", "must be ignored", 2);
        assertEquals("RUNNING", status(firstClaim.id()));

        queue.fail(firstClaim.id(), "first-token", "temporary outage", 2);
        assertEquals("PENDING", status(firstClaim.id()));
        assertEquals(1, attempts(firstClaim.id()));
        assertTrue(jdbc.queryForObject(
                "SELECT next_attempt_at > CURRENT_TIMESTAMP FROM storage_deletion_task WHERE id = ?",
                Boolean.class,
                firstClaim.id()));
        assertEquals(0, queue.claim(1, 300, "too-early").size());

        jdbc.update("UPDATE storage_deletion_task SET next_attempt_at = CURRENT_TIMESTAMP WHERE id = ?", firstClaim.id());
        var secondClaim = queue.claim(1, 300, "second-token").getFirst();
        queue.fail(secondClaim.id(), "second-token", "permanent outage", 2);

        assertEquals("FAILED", status(secondClaim.id()));
        assertEquals(2, attempts(secondClaim.id()));
        assertEquals("permanent outage", jdbc.queryForObject(
                "SELECT last_error FROM storage_deletion_task WHERE id = ?", String.class, secondClaim.id()));
    }

    private String status(Long id) {
        return jdbc.queryForObject("SELECT status FROM storage_deletion_task WHERE id = ?", String.class, id);
    }

    private int attempts(Long id) {
        return jdbc.queryForObject("SELECT attempts FROM storage_deletion_task WHERE id = ?", Integer.class, id);
    }
}
