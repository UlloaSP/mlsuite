package dev.ulloasp.mlsuite.storage;


import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StorageDeletionQueue {

    private final StorageDeletionTaskRepository tasks;
    private final JdbcTemplate jdbc;

    /**
     * Asks for one stored version of an object to go, or every version of the key when
     * {@code versionId} is null: for keys nothing writes again, as a model's key can be. Asking
     * twice is one task, and asking again after a task ended starts it over.
     * {@code organizationId} is whose object it is, kept to say so if the deletion fails for good.
     */
    public void enqueue(Long organizationId, String bucket, String objectKey, String versionId) {
        jdbc.update("""
                INSERT INTO storage_deletion_task (organization_id, storage_bucket, storage_object_key, storage_version_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (storage_bucket, storage_object_key, storage_version_id) DO UPDATE
                SET status = 'PENDING', attempts = 0, next_attempt_at = CURRENT_TIMESTAMP, error_message = NULL,
                    completed_at = NULL
                WHERE storage_deletion_task.status IN ('COMPLETED', 'FAILED')""",
                organizationId, bucket, objectKey, versionId);
    }

}
