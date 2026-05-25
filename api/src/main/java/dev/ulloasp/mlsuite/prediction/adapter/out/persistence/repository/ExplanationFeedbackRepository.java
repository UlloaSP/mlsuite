/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;

@Repository
public interface ExplanationFeedbackRepository extends JpaRepository<ExplanationFeedback, Long> {
    @Query("SELECT ef FROM ExplanationFeedback ef WHERE ef.id = :explanationFeedbackId AND ef.prediction.signature.model.organization.id = :organizationId")
    Optional<ExplanationFeedback> findByIdAndOrganizationId(Long explanationFeedbackId, Long organizationId);

    @Query("SELECT ef FROM ExplanationFeedback ef WHERE ef.prediction.id = :predictionId AND ef.prediction.signature.model.organization.id = :organizationId ORDER BY ef.order ASC")
    List<ExplanationFeedback> findByPredictionIdAndOrganizationId(Long predictionId, Long organizationId);

    @Query("""
            SELECT ef FROM ExplanationFeedback ef
            WHERE ef.prediction.id = :predictionId
            AND ef.prediction.signature.model.organization.id = :organizationId
            AND (
                NOT EXISTS (
                    SELECT rlp.id FROM ReviewLinkPrediction rlp
                    WHERE rlp.prediction.id = ef.prediction.id
                )
                OR EXISTS (
                    SELECT submission.id FROM ReviewLinkPredictionSubmission submission
                    WHERE submission.reviewLinkPrediction.prediction.id = ef.prediction.id
                    AND submission.user.id = ef.user.id
                )
            )
            ORDER BY ef.order ASC
            """)
    List<ExplanationFeedback> findPublishedByPredictionIdAndOrganizationId(Long predictionId, Long organizationId);

    List<ExplanationFeedback> findByPredictionId(Long predictionId);

    @Query("SELECT ef FROM ExplanationFeedback ef WHERE ef.prediction.id = :predictionId AND ef.user.id = :userId ORDER BY ef.order ASC")
    List<ExplanationFeedback> findByPredictionIdAndUserId(Long predictionId, Long userId);

    @Query("SELECT ef FROM ExplanationFeedback ef WHERE ef.prediction.id = :predictionId AND ef.user.id = :userId AND ef.order = :order")
    Optional<ExplanationFeedback> findByPredictionIdAndUserIdAndOrder(Long predictionId, Long userId, int order);

    boolean existsByPredictionIdAndUserId(Long predictionId, Long userId);

    void deleteByPredictionId(Long predictionId);
}

