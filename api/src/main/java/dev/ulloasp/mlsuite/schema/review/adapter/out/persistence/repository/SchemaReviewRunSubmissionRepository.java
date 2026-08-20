package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;

public interface SchemaReviewRunSubmissionRepository extends JpaRepository<SchemaReviewRunSubmission, Long> {
    Optional<SchemaReviewRunSubmission> findByReviewRunIdAndUserId(Long reviewRunId, Long userId);

    boolean existsByReviewRunIdAndUserId(Long reviewRunId, Long userId);

    List<SchemaReviewRunSubmission> findByReviewRunReviewIdAndUserId(Long reviewId, Long userId);
}
