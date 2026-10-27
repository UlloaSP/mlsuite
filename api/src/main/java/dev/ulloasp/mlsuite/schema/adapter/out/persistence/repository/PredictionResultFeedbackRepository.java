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

    /** A member's answer to one question in one review. */
    Optional<PredictionResultFeedback> findByResultIdAndUserIdAndTypeAndOrderAndReviewId(
            Long resultId, Long userId, PredictionResultFeedbackType type, int order, Long reviewId);

    /** A member's answer to one question outside any review: on a public page. */
    Optional<PredictionResultFeedback> findByResultIdAndUserIdAndTypeAndOrderAndReviewIsNull(
            Long resultId, Long userId, PredictionResultFeedbackType type, int order);

    Optional<PredictionResultFeedback> findByResultIdAndVisitorIdAndTypeAndOrder(
            Long resultId, UUID visitorId, PredictionResultFeedbackType type, int order);

    /** A visitor's own answers on their runs, for the public page that reads them back. */
    List<PredictionResultFeedback> findByResultRunIdInAndVisitorIdOrderByIdAsc(Collection<Long> runIds, UUID visitorId);

    /** A signed-in member's own answers on public-page runs, given outside any review. */
    List<PredictionResultFeedback> findByResultRunIdInAndUserIdAndReviewIsNullOrderByIdAsc(Collection<Long> runIds,
            Long userId);

    /** A reviewer's answers on one result in one review. */
    @Query("""
            SELECT f FROM PredictionResultFeedback f
            WHERE f.result.id = :resultId AND f.user.id = :userId AND f.review.id = :reviewId
            ORDER BY f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByResultIdAndUserIdAndReviewId(Long resultId, Long userId, Long reviewId);

    /** A reviewer's answers on a run in one review. */
    List<PredictionResultFeedback> findByResultRunIdAndUserIdAndReviewId(Long runId, Long userId, Long reviewId);

    boolean existsByResultRunIdAndUserIdAndReviewId(Long runId, Long userId, Long reviewId);

    /** Which of the review runs the user has answered at least once, in their own review. */
    @Query("""
            SELECT DISTINCT rr.id FROM SchemaReviewRun rr, PredictionResultFeedback f
            WHERE rr.id IN :reviewRunIds AND f.result.run = rr.run AND f.review = rr.review AND f.user.id = :userId
            """)
    Set<Long> findReviewRunIdsAnsweredBy(Collection<Long> reviewRunIds, Long userId);
}
