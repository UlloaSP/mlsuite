package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;

public interface PredictionResultFeedbackRepository extends JpaRepository<PredictionResultFeedback, Long> {

    /** Every answer on these runs, by anyone and in any review. */
    List<PredictionResultFeedback> findByResultRunIdIn(Collection<Long> runIds);

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
            JOIN FETCH f.createdBy
            WHERE r.run.id IN :runIds
            AND r.run.schemaVersion.schema.organization.id = :organizationId
            ORDER BY r.run.id ASC, r.id ASC, f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByRunIdsAndOrganizationId(List<Long> runIds, Long organizationId);

    /** A member's answer to one question in one review. */
    Optional<PredictionResultFeedback> findByResultIdAndCreatedByUserIdAndTypeAndOrderAndReviewId(
            Long resultId, Long userId, PredictionResultFeedbackType type, int order, Long reviewId);

    /** An author's answer to one question outside any review: on a public page, by a member or a visitor. */
    Optional<PredictionResultFeedback> findByResultIdAndCreatedByIdAndTypeAndOrderAndReviewIsNull(
            Long resultId, Long principalId, PredictionResultFeedbackType type, int order);

    /** An author's own answers on public-page runs, given outside any review, for the page that reads them back. */
    List<PredictionResultFeedback> findByResultRunIdInAndCreatedByIdAndReviewIsNullOrderByIdAsc(Collection<Long> runIds,
            Long principalId);

    /** A reviewer's answers on one result in one review. */
    @Query("""
            SELECT f FROM PredictionResultFeedback f
            WHERE f.result.id = :resultId AND f.createdBy.userId = :userId AND f.review.id = :reviewId
            ORDER BY f.type ASC, f.order ASC
            """)
    List<PredictionResultFeedback> findByResultIdAndUserIdAndReviewId(Long resultId, Long userId, Long reviewId);

    /** A reviewer's answers on a run in one review. */
    List<PredictionResultFeedback> findByResultRunIdAndCreatedByUserIdAndReviewId(Long runId, Long userId, Long reviewId);

    boolean existsByResultRunIdAndCreatedByUserIdAndReviewId(Long runId, Long userId, Long reviewId);

    /** When a reviewer last saved feedback on a review run. */
    interface FeedbackSaved {
        Long getReviewRunId();

        OffsetDateTime getSavedAt();
    }

    /** The review runs among these that the reviewer answered, each with when they last saved. */
    @Query("""
            SELECT rr.id AS reviewRunId, MAX(f.updatedAt) AS savedAt FROM SchemaReviewRun rr, PredictionResultFeedback f
            WHERE rr.id IN :reviewRunIds AND f.result.run = rr.run AND f.review = rr.review AND f.createdBy.userId = :userId
            GROUP BY rr.id
            """)
    List<FeedbackSaved> findFeedbackSaved(Collection<Long> reviewRunIds, Long userId);
}
