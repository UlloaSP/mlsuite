package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StorageDeletionTaskRepository extends JpaRepository<StorageDeletionTask, Long> {

    List<StorageDeletionTask> findTop20ByStatusAndNextAttemptAtBeforeOrderByIdAsc(
            StorageDeletionStatus status,
            OffsetDateTime nextAttemptAt);
}
