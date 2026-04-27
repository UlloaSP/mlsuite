/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.prediction.entities.ExplanationFeedback;

@Repository
public interface ExplanationFeedbackRepository extends JpaRepository<ExplanationFeedback, Long> {
    @Query("SELECT ef FROM ExplanationFeedback ef WHERE ef.id = :explanationFeedbackId AND ef.prediction.signature.model.user.id = :userId")
    Optional<ExplanationFeedback> findByIdAndUserId(Long explanationFeedbackId, Long userId);

    @Query("SELECT ef FROM ExplanationFeedback ef WHERE ef.prediction.id = :predictionId AND ef.prediction.signature.model.user.id = :userId ORDER BY ef.order ASC")
    List<ExplanationFeedback> findByPredictionIdAndUserId(Long predictionId, Long userId);

    List<ExplanationFeedback> findByPredictionId(Long predictionId);

    void deleteByPredictionId(Long predictionId);
}
