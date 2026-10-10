package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;

public interface SchemaReviewAssigneeRepository extends JpaRepository<SchemaReviewAssignee, Long> {
    boolean existsByReviewIdAndUserId(Long reviewId, Long userId);

    List<SchemaReviewAssignee> findByReviewIdOrderByIdAsc(Long reviewId);

    Optional<SchemaReviewAssignee> findByReviewIdAndUserId(Long reviewId, Long userId);

    /** Every reviewer assignment of one inference, across the reviews that include it. */
    @Query("""
            SELECT COUNT(assignee) FROM SchemaReviewAssignee assignee, SchemaReviewRun rr
            WHERE rr.review = assignee.review AND rr.run.id = :predictionRunId
            """)
    long countByPredictionRunId(Long predictionRunId);

    /** Those of them the reviewer already submitted. */
    @Query("""
            SELECT COUNT(assignee) FROM SchemaReviewAssignee assignee, SchemaReviewRun rr
            WHERE rr.review = assignee.review AND rr.run.id = :predictionRunId
            AND EXISTS (
                SELECT 1 FROM SchemaReviewRunSubmission submission
                WHERE submission.reviewRun = rr AND submission.user = assignee.user
            )
            """)
    long countSubmittedByPredictionRunId(Long predictionRunId);
}
