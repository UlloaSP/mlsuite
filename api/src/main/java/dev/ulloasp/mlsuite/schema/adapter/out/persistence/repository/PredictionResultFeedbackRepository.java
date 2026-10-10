package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;

public interface PredictionResultFeedbackRepository extends JpaRepository<PredictionResultFeedback, Long> {

    void deleteByResult_Run_Id(Long runId);

    void deleteByResultRunIdAndUserId(Long runId, Long userId);

    @Query("""
            SELECT f FROM PredictionResultFeedback f
            WHERE f.result.id = :resultId
            AND f.result.run.schemaVersion.schema.organization.id = :organizationId
            ORDER BY f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByResultIdAndOrganizationId(Long resultId, Long organizationId);

    @Query("""
            SELECT f FROM PredictionResultFeedback f
            JOIN FETCH f.result r
            LEFT JOIN FETCH f.user
            WHERE r.run.id IN :runIds
            AND r.run.schemaVersion.schema.organization.id = :organizationId
            ORDER BY r.run.id ASC, r.id ASC, f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByRunIdsAndOrganizationId(List<Long> runIds, Long organizationId);

    @Query("""
            SELECT f FROM PredictionResultFeedback f
            JOIN FETCH f.result r
            LEFT JOIN FETCH f.user
            WHERE r.run.schemaVersion.schema.organization.id = :organizationId
            ORDER BY r.run.id ASC, r.id ASC, f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByOrganizationId(Long organizationId);

    Optional<PredictionResultFeedback> findByResultIdAndUserIdAndTypeAndOrder(
            Long resultId, Long userId, PredictionResultFeedbackType type, int order);

    Optional<PredictionResultFeedback> findByResultIdAndVisitorIdAndTypeAndOrder(
            Long resultId, UUID visitorId, PredictionResultFeedbackType type, int order);

    /** A visitor's own answers on their runs, for the public page that reads them back. */
    List<PredictionResultFeedback> findByResultRunIdInAndVisitorIdOrderByIdAsc(Collection<Long> runIds, UUID visitorId);

    List<PredictionResultFeedback> findByResultRunIdInAndUserIdOrderByIdAsc(Collection<Long> runIds, Long userId);

    @Query("""
            SELECT f FROM PredictionResultFeedback f
            WHERE f.result.id = :resultId AND f.user.id = :userId
            ORDER BY f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByResultIdAndUserId(Long resultId, Long userId);

    boolean existsByResultRunIdAndUserId(Long runId, Long userId);

    /** Which of the runs the user has answered at least once. */
    @Query("""
            SELECT DISTINCT f.result.run.id FROM PredictionResultFeedback f
            WHERE f.result.run.id IN :runIds AND f.user.id = :userId
            """)
    Set<Long> findRunIdsAnsweredBy(Collection<Long> runIds, Long userId);

    @Query("""
            SELECT f FROM PredictionResultFeedback f
            WHERE f.id = :id
            AND f.result.run.schemaVersion.schema.organization.id = :organizationId
            """)
    Optional<PredictionResultFeedback> findByIdAndOrganizationId(Long id, Long organizationId);
}
