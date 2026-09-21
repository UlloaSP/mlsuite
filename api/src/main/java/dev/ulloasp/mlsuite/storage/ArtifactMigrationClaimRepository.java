package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ArtifactMigrationClaimRepository {

    private final JdbcTemplate jdbcTemplate;

    public ArtifactMigrationClaimRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public List<Long> claim(int batchSize, int maxAttempts, long staleAfterSeconds, String workerId) {
        OffsetDateTime staleBefore = OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(staleAfterSeconds);
        return jdbcTemplate.queryForList("""
                WITH candidates AS (
                    SELECT id
                    FROM model
                    WHERE artifact_migration_attempts < ?
                      AND (
                          artifact_state IN ('INLINE_ONLY', 'UNVERIFIED', 'FAILED')
                          OR (artifact_state = 'RUNNING' AND artifact_migration_started_at < ?)
                      )
                    ORDER BY id
                    FOR UPDATE SKIP LOCKED
                    LIMIT ?
                )
                UPDATE model AS target
                SET artifact_state = 'RUNNING',
                    artifact_migration_attempts = artifact_migration_attempts + 1,
                    artifact_migration_started_at = CURRENT_TIMESTAMP,
                    artifact_migration_worker = ?,
                    artifact_migration_error = NULL
                FROM candidates
                WHERE target.id = candidates.id
                RETURNING target.id
                """, Long.class, maxAttempts, staleBefore, batchSize, workerId);
    }

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
                    artifact_migration_worker = NULL
                WHERE artifact_state = 'FAILED'
                """);
    }
}
