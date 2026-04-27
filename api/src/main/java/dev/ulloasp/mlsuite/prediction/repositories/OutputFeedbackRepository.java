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

import dev.ulloasp.mlsuite.prediction.entities.OutputFeedback;

@Repository
public interface OutputFeedbackRepository extends JpaRepository<OutputFeedback, Long> {
    @Query("SELECT of FROM OutputFeedback of WHERE of.id = :outputFeedbackId AND of.prediction.signature.model.user.id = :userId")
    Optional<OutputFeedback> findByIdAndUserId(Long outputFeedbackId, Long userId);

    @Query("SELECT of FROM OutputFeedback of WHERE of.prediction.id = :predictionId AND of.prediction.signature.model.user.id = :userId ORDER BY of.order ASC")
    List<OutputFeedback> findByPredictionIdAndUserId(Long predictionId, Long userId);

    List<OutputFeedback> findByPredictionId(Long predictionId);

    void deleteByPredictionId(Long predictionId);
}
