package dev.ulloasp.mlsuite.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.review.domain.model.ReviewLinkPredictionSubmission;

public interface ReviewLinkPredictionSubmissionRepository extends JpaRepository<ReviewLinkPredictionSubmission, Long> {
    @Query("SELECT s FROM ReviewLinkPredictionSubmission s WHERE s.reviewLinkPrediction.reviewLink.id = :reviewLinkId AND s.user.id = :userId")
    List<ReviewLinkPredictionSubmission> findByReviewLinkIdAndUserId(Long reviewLinkId, Long userId);

    Optional<ReviewLinkPredictionSubmission> findByReviewLinkPredictionIdAndUserId(Long reviewLinkPredictionId, Long userId);

    boolean existsByReviewLinkPredictionIdAndUserId(Long reviewLinkPredictionId, Long userId);
}
