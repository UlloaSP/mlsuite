package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;

public interface PredictionRunRepository extends JpaRepository<PredictionRun, Long> {
    @Query("SELECT r FROM PredictionRun r WHERE r.id = :id AND r.schemaVersion.schema.organization.id = :organizationId")
    Optional<PredictionRun> findByIdAndOrganizationId(Long id, Long organizationId);

    @Query("""
            SELECT r FROM PredictionRun r
            WHERE r.schemaVersion.id = :schemaVersionId
            AND r.schemaVersion.schema.organization.id = :organizationId
            ORDER BY r.createdAt DESC
            """)
    List<PredictionRun> findBySchemaVersionIdAndOrganizationId(Long schemaVersionId, Long organizationId);

    @Query("SELECT COALESCE(MAX(r.id), 0) FROM PredictionRun r")
    Long findLastPredictionRunId();

    boolean existsBySchemaVersionIdAndName(Long schemaVersionId, String name);
}
