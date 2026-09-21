package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "storage_deletion_task", uniqueConstraints = {
        @UniqueConstraint(name = "uq_storage_deletion_object", columnNames = {"bucket", "object_key"})
})
@Getter
@Setter
@NoArgsConstructor
public class StorageDeletionTask {

    public StorageDeletionTask(String bucket, String objectKey, String objectVersionId) {
        this.bucket = bucket;
        this.objectKey = objectKey;
        this.objectVersionId = objectVersionId;
        this.status = StorageDeletionStatus.PENDING;
        this.nextAttemptAt = OffsetDateTime.now();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bucket", nullable = false, length = 100)
    private String bucket;

    @Column(name = "object_key", nullable = false, length = 512)
    private String objectKey;

    @Column(name = "object_version_id", length = 255)
    private String objectVersionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private StorageDeletionStatus status;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "next_attempt_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime nextAttemptAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @Column(name = "completed_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime completedAt;

    @Column(name = "processing_started_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime processingStartedAt;

    @Column(name = "processing_token", length = 128)
    private String processingToken;
}
