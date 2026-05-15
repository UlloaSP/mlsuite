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

    List<ExplanationFeedback> findByPredictionId(Long predictionId);

    @Query("SELECT ef FROM ExplanationFeedback ef WHERE ef.prediction.id = :predictionId AND ef.user.id = :userId ORDER BY ef.order ASC")
    List<ExplanationFeedback> findByPredictionIdAndUserId(Long predictionId, Long userId);

    boolean existsByPredictionIdAndUserId(Long predictionId, Long userId);

    void deleteByPredictionId(Long predictionId);
}

