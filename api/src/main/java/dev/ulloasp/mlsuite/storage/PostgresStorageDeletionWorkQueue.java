package dev.ulloasp.mlsuite.storage;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class PostgresStorageDeletionWorkQueue implements StorageDeletionWorkQueue {

    private final JdbcTemplate jdbcTemplate;

    public PostgresStorageDeletionWorkQueue(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public List<StorageDeletionWorkItem> claim(int batchSize, long staleAfterSeconds, String claimToken) {
        return jdbcTemplate.query("""
                WITH candidates AS (
                    SELECT id
                    FROM storage_deletion_task
                    WHERE (status = 'PENDING' AND next_attempt_at <= CURRENT_TIMESTAMP)
                       OR (status = 'RUNNING' AND processing_started_at
                           < CURRENT_TIMESTAMP - (? * INTERVAL '1 second'))
                    ORDER BY id
                    FOR UPDATE SKIP LOCKED
                    LIMIT ?
                )
                UPDATE storage_deletion_task AS target
                SET status = 'RUNNING',
                    processing_started_at = CURRENT_TIMESTAMP,
                    processing_token = ?
                FROM candidates
                WHERE target.id = candidates.id
                RETURNING target.id, target.bucket, target.object_key
                """,
                (result, row) -> new StorageDeletionWorkItem(
                        result.getLong("id"),
                        result.getString("bucket"),
                        result.getString("object_key")),
                staleAfterSeconds,
                batchSize,
                claimToken);
    }

    @Override
    @Transactional
    public void complete(Long id, String claimToken) {
        jdbcTemplate.update("""
                UPDATE storage_deletion_task
                SET status = 'COMPLETED',
                    completed_at = CURRENT_TIMESTAMP,
                    last_error = NULL,
                    processing_started_at = NULL,
                    processing_token = NULL
                WHERE id = ? AND status = 'RUNNING' AND processing_token = ?
                """, id, claimToken);
    }

    @Override
    @Transactional
    public void fail(Long id, String claimToken, String error, int maxAttempts) {
        jdbcTemplate.update("""
                UPDATE storage_deletion_task
                SET attempts = attempts + 1,
                    status = CASE WHEN attempts + 1 >= ? THEN 'FAILED' ELSE 'PENDING' END,
                    next_attempt_at = CURRENT_TIMESTAMP
                        + LEAST(3600, power(2, LEAST(attempts + 1, 10))) * INTERVAL '1 second',
                    last_error = ?,
                    processing_started_at = NULL,
                    processing_token = NULL
                WHERE id = ? AND status = 'RUNNING' AND processing_token = ?
                """, maxAttempts, error, id, claimToken);
    }
}
