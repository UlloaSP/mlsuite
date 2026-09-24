package dev.ulloasp.mlsuite.storage;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class PostgresArtifactMigrationQueue implements ArtifactMigrationQueue {

    private final JdbcTemplate jdbcTemplate;

    public PostgresArtifactMigrationQueue(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public Optional<ArtifactMigrationWorkItem> claim(
            int maxAttempts, long staleAfterSeconds, String leaseToken) {
        List<ArtifactMigrationWorkItem> claimed = jdbcTemplate.query("""
                WITH candidates AS (
                    SELECT id
                    FROM model
                    WHERE artifact_migration_attempts < ?
                      AND (
                          artifact_state IN ('INLINE_ONLY', 'UNVERIFIED', 'FAILED')
                          OR (artifact_state = 'RUNNING' AND artifact_migration_started_at
                              < CURRENT_TIMESTAMP - (? * INTERVAL '1 second'))
                      )
                    ORDER BY id
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                )
                UPDATE model AS target
                SET artifact_state = 'RUNNING',
                    version = version + 1,
                    artifact_migration_attempts = artifact_migration_attempts + 1,
                    artifact_migration_started_at = CURRENT_TIMESTAMP,
                    artifact_migration_worker = ?,
                    artifact_migration_error = NULL
                FROM candidates
                WHERE target.id = candidates.id
                RETURNING target.id
                """,
                (result, row) -> new ArtifactMigrationWorkItem(
                        result.getLong("id"),
                        leaseToken),
                maxAttempts,
                staleAfterSeconds,
                leaseToken);
        return claimed.stream().findFirst();
    }

    @Override
    @Transactional
    public boolean renew(Long id, String leaseToken) {
        return jdbcTemplate.update("""
                UPDATE model
                SET artifact_migration_started_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND artifact_state = 'RUNNING'
                  AND artifact_migration_worker = ?
                """, id, leaseToken) == 1;
    }

    @Override
    @Transactional
    public int retryFailed() {
        return jdbcTemplate.update("""
                UPDATE model
                SET artifact_state = CASE
                        WHEN storage_object_key IS NULL THEN 'INLINE_ONLY'
                        ELSE 'UNVERIFIED'
                    END,
                    artifact_migration_attempts = 0,
                    artifact_migration_error = NULL,
                    artifact_migration_started_at = NULL,
                    artifact_migration_worker = NULL,
                    version = version + 1
                WHERE artifact_state = 'FAILED'
                """);
    }
}
