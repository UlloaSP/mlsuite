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

import dev.ulloasp.mlsuite.prediction.entities.Prediction;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    List<Prediction> findBySignatureId(Long signatureId);

    @Query("SELECT p FROM Prediction p WHERE p.id = :predictionId AND p.signature.model.user.id = :userId")
    Optional<Prediction> findByIdAndUserId(Long predictionId, Long userId);

    boolean existsBySignatureIdAndName(Long signatureId, String name);
}
