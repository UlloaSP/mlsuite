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

import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;

@Repository
public interface OutputFeedbackRepository extends JpaRepository<OutputFeedback, Long> {
    @Query("SELECT of FROM OutputFeedback of WHERE of.id = :outputFeedbackId AND of.prediction.signature.model.organization.id = :organizationId")
    Optional<OutputFeedback> findByIdAndOrganizationId(Long outputFeedbackId, Long organizationId);

    @Query("SELECT of FROM OutputFeedback of WHERE of.prediction.id = :predictionId AND of.prediction.signature.model.organization.id = :organizationId ORDER BY of.order ASC")
    List<OutputFeedback> findByPredictionIdAndOrganizationId(Long predictionId, Long organizationId);

    List<OutputFeedback> findByPredictionId(Long predictionId);

    void deleteByPredictionId(Long predictionId);
}

