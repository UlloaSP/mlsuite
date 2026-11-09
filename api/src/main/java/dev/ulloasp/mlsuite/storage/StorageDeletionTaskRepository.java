package dev.ulloasp.mlsuite.storage;

import java.util.Collection;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StorageDeletionTaskRepository extends JpaRepository<StorageDeletionTask, Long> {

    long countByStatus(StorageDeletionStatus status);

}
