package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class PostgresStorageDeletionWorkQueue implements StorageDeletionWorkQueue {

    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public List<StorageDeletionWorkItem> claim(int batchSize, long staleAfterSeconds, String claimToken) {
        return jdbcTemplate.query("""
                WITH candidates AS (
                    SELECT id
                    FROM storage_deletion_task
                    WHERE (status = 'PENDING' AND next_attempt_at <= CURRENT_TIMESTAMP)
                       OR (status = 'RUNNING' AND lease_expires_at < CURRENT_TIMESTAMP)
                    ORDER BY id
                    FOR UPDATE SKIP LOCKED
                    LIMIT ?
                )
                UPDATE storage_deletion_task AS target
                SET status = 'RUNNING',
                    lease_expires_at = CURRENT_TIMESTAMP + (? * INTERVAL '1 second'),
                    lease_owner = ?
                FROM candidates
                WHERE target.id = candidates.id
                RETURNING target.id, target.organization_id, target.storage_bucket, target.storage_object_key, target.storage_version_id
                """,
                (result, row) -> new StorageDeletionWorkItem(
                        result.getLong("id"),
                        result.getObject("organization_id", Long.class),
                        result.getString("storage_bucket"),
                        result.getString("storage_object_key"),
                        result.getString("storage_version_id")),
                batchSize,
                staleAfterSeconds,
                claimToken);
    }

    @Override
    @Transactional
    public void complete(Long id, String claimToken) {
        jdbcTemplate.update("""
                UPDATE storage_deletion_task
                SET status = 'COMPLETED',
                    completed_at = CURRENT_TIMESTAMP,
                    error_message = NULL,
                    lease_expires_at = NULL,
                    lease_owner = NULL
                WHERE id = ? AND status = 'RUNNING' AND lease_owner = ?
                """, id, claimToken);
    }

    @Override
    @Transactional
    public boolean fail(Long id, String claimToken, String error, int maxAttempts) {
        return jdbcTemplate.query("""
                UPDATE storage_deletion_task
                SET attempts = attempts + 1,
                    status = CASE WHEN attempts + 1 >= ? THEN 'FAILED' ELSE 'PENDING' END,
                    next_attempt_at = CURRENT_TIMESTAMP
                        + LEAST(3600, power(2, LEAST(attempts + 1, 10))) * INTERVAL '1 second',
                    error_message = ?,
                    lease_expires_at = NULL,
                    lease_owner = NULL
                WHERE id = ? AND status = 'RUNNING' AND lease_owner = ?
                RETURNING status
                """, (result, row) -> "FAILED".equals(result.getString(1)), maxAttempts, error, id, claimToken)
                .stream().findFirst().orElse(false);
    }

    @Override
    @Transactional
    public int pruneCompleted(OffsetDateTime before, int batchSize) {
        return jdbcTemplate.update("""
                DELETE FROM storage_deletion_task WHERE id IN (
                    SELECT id FROM storage_deletion_task
                    WHERE status = 'COMPLETED' AND completed_at < ?
                    ORDER BY completed_at LIMIT ?)""", before, batchSize);
    }
}
