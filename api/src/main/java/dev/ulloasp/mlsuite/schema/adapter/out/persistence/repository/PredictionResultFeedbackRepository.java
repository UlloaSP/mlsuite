package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;

public interface PredictionResultFeedbackRepository extends JpaRepository<PredictionResultFeedback, Long> {

    @Query("""
            SELECT f FROM PredictionResultFeedback f
            WHERE f.result.id = :resultId
            AND f.result.run.schemaVersion.schema.organization.id = :organizationId
            ORDER BY f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByResultIdAndOrganizationId(Long resultId, Long organizationId);

    Optional<PredictionResultFeedback> findByResultIdAndUserIdAndTypeAndOrder(
            Long resultId, Long userId, PredictionResultFeedbackType type, int order);

    @Query("""
            SELECT f FROM PredictionResultFeedback f
            WHERE f.result.id = :resultId AND f.user.id = :userId
            ORDER BY f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByResultIdAndUserId(Long resultId, Long userId);

    @Query("""
            SELECT f FROM PredictionResultFeedback f
            WHERE f.id = :id
            AND f.result.run.schemaVersion.schema.organization.id = :organizationId
            """)
    Optional<PredictionResultFeedback> findByIdAndOrganizationId(Long id, Long organizationId);
}
