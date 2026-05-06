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

import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    List<Prediction> findBySignatureId(Long signatureId);

    @Query("SELECT p FROM Prediction p WHERE p.id = :predictionId AND p.signature.model.organization.id = :organizationId")
    Optional<Prediction> findByIdAndOrganizationId(Long predictionId, Long organizationId);

    @Query("SELECT p FROM Prediction p WHERE p.signature.id = :signatureId AND p.signature.model.organization.id = :organizationId")
    List<Prediction> findBySignatureIdAndOrganizationId(Long signatureId, Long organizationId);

    Optional<Prediction> findBySignatureIdAndName(Long signatureId, String name);

    boolean existsBySignatureIdAndName(Long signatureId, String name);
}

