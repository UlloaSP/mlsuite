package dev.ulloasp.mlsuite.review.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.review.domain.model.ReviewLinkPrediction;

public interface ReviewLinkPredictionRepository extends JpaRepository<ReviewLinkPrediction, Long> {
    List<ReviewLinkPrediction> findByReviewLinkId(Long reviewLinkId);

    List<ReviewLinkPrediction> findByPredictionId(Long predictionId);

    Optional<ReviewLinkPrediction> findByReviewLinkIdAndPredictionId(Long reviewLinkId, Long predictionId);

    boolean existsByReviewLinkIdAndPredictionId(Long reviewLinkId, Long predictionId);

    long countByReviewLinkId(Long reviewLinkId);
}
