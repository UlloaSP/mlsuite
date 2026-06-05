package dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewLinkRunSubmission;

public interface SchemaReviewLinkRunSubmissionRepository extends JpaRepository<SchemaReviewLinkRunSubmission, Long> {
    Optional<SchemaReviewLinkRunSubmission> findByReviewLinkRunIdAndUserId(Long reviewLinkRunId, Long userId);

    boolean existsByReviewLinkRunIdAndUserId(Long reviewLinkRunId, Long userId);

    List<SchemaReviewLinkRunSubmission> findByReviewLinkRunReviewLinkIdAndUserId(Long reviewLinkId, Long userId);
}
