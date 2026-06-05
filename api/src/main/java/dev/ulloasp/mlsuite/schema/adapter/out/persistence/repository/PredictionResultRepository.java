package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;

public interface PredictionResultRepository extends JpaRepository<PredictionResult, Long> {
    List<PredictionResult> findByRunIdOrderByIdAsc(Long runId);

    @Query("""
            SELECT r FROM PredictionResult r
            WHERE r.id = :id
            AND r.run.schemaVersion.schema.organization.id = :organizationId
            """)
    Optional<PredictionResult> findByIdAndOrganizationId(Long id, Long organizationId);
}
