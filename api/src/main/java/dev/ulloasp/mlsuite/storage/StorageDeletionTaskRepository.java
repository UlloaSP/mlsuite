package dev.ulloasp.mlsuite.storage;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StorageDeletionTaskRepository extends JpaRepository<StorageDeletionTask, Long> {

    long countByStatus(StorageDeletionStatus status);
}
