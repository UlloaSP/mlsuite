package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;

public interface SchemaReviewRunRepository extends JpaRepository<SchemaReviewRun, Long> {

    /** A review run as one reviewer sees it: with their submission once they completed it. */
    interface ReviewerRun {
        SchemaReviewRun getReviewRun();

        SchemaReview getReview();

        PredictionRun getRun();

        SchemaReviewRunSubmission getSubmission();
    }

    String SELECT_REVIEWER_RUN = "SELECT rr AS reviewRun, review AS review, run AS run, submission AS submission ";

    String REVIEWER_RUNS = """
            FROM SchemaReviewRun rr
            JOIN rr.review review
            JOIN rr.run run
            LEFT JOIN SchemaReviewRunSubmission submission
                ON submission.reviewRun = rr AND submission.user.id = :userId
            """;

    /** The one rule for a reviewer's inbox: unsubmitted runs of the open reviews assigned to them. */
    String INBOX = REVIEWER_RUNS + """
            WHERE review.organization.id = :organizationId
            AND review.expiresAt > :now
            AND submission.id IS NULL
            AND EXISTS (
                SELECT 1 FROM SchemaReviewAssignee assignee
                WHERE assignee.review = review AND assignee.user.id = :userId
            )
            """;

    String REVIEW = REVIEWER_RUNS + "WHERE review.id = :reviewId\n";

    /** {@code state} is a SchemaReviewState name, "active" (not completed) or "all"; any other matches nothing. */
    String IN_STATE = """
            AND (
                :state = 'all'
                OR (:state = 'active' AND submission.id IS NULL)
                OR (:state = 'COMPLETED' AND submission.id IS NOT NULL)
                OR (:state = 'IN_PROGRESS' AND submission.id IS NULL AND EXISTS (
                    SELECT 1 FROM PredictionResultFeedback feedback
                    WHERE feedback.result.run = run AND feedback.user.id = :userId
                ))
                OR (:state = 'PENDING' AND submission.id IS NULL AND NOT EXISTS (
                    SELECT 1 FROM PredictionResultFeedback feedback
                    WHERE feedback.result.run = run AND feedback.user.id = :userId
                ))
            )
            """;

    String INBOX_SEARCH = """
            AND (
                lower(run.name) LIKE :search ESCAPE '!'
                OR lower(review.schema.name) LIKE :search ESCAPE '!'
            )
            """;

    String REVIEW_SEARCH = """
            AND (
                lower(run.name) LIKE :search ESCAPE '!'
                OR str(run.id) LIKE :search ESCAPE '!'
            )
            """;

    /** Newest state first: a run enters its state when it is created or when it is submitted. */
    String BY_STATE_ENTERED = "ORDER BY coalesce(submission.submittedAt, run.createdAt) DESC, rr.publicId ASC";

    List<SchemaReviewRun> findByReviewIdOrderByIdAsc(Long reviewId);

    List<SchemaReviewRun> findByRunIdOrderByIdAsc(Long runId);

    Optional<SchemaReviewRun> findByReviewIdAndPublicId(Long reviewId, String publicId);

    Optional<SchemaReviewRun> findByRunIdAndPublicId(Long runId, String publicId);

    @Query(value = SELECT_REVIEWER_RUN + INBOX + IN_STATE + INBOX_SEARCH + BY_STATE_ENTERED,
            countQuery = "SELECT COUNT(rr) " + INBOX + IN_STATE + INBOX_SEARCH)
    Page<ReviewerRun> findInboxPage(Long organizationId, Long userId, OffsetDateTime now, String state,
            String search, Pageable pageable);

    @Query("SELECT rr " + INBOX + IN_STATE)
    List<SchemaReviewRun> findInbox(Long organizationId, Long userId, OffsetDateTime now, String state);

    @Query("SELECT COUNT(rr) " + INBOX + IN_STATE)
    long countInbox(Long organizationId, Long userId, OffsetDateTime now, String state);

    @Query(value = SELECT_REVIEWER_RUN + REVIEW + IN_STATE + REVIEW_SEARCH + BY_STATE_ENTERED,
            countQuery = "SELECT COUNT(rr) " + REVIEW + IN_STATE + REVIEW_SEARCH)
    Page<ReviewerRun> findReviewPage(Long reviewId, Long userId, String state, String search, Pageable pageable);

    @Query("SELECT COUNT(rr) " + REVIEW + IN_STATE)
    long countInReview(Long reviewId, Long userId, String state);
}
