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

import dev.ulloasp.mlsuite.prediction.entities.Target;

@Repository
public interface TargetRepository extends JpaRepository<Target, Long> {
    List<Target> findByPredictionId(Long predictionId);

    @Query("SELECT t FROM Target t WHERE t.id = :targetId AND t.organization.id = :organizationId")
    Optional<Target> findByIdAndOrganizationId(Long targetId, Long organizationId);

    @Query("SELECT t FROM Target t WHERE t.id = :targetId AND t.prediction.signature.model.createdBy.id = :userId")
    Optional<Target> findByIdAndUserId(Long targetId, Long userId);

    @Query("SELECT t FROM Target t WHERE t.prediction.id = :predictionId AND t.organization.id = :organizationId")
    List<Target> findByPredictionIdAndOrganizationId(Long predictionId, Long organizationId);

    @Query("SELECT t FROM Target t WHERE t.prediction.id = :predictionId AND t.prediction.signature.model.createdBy.id = :userId")
    List<Target> findByPredictionIdAndUserId(Long predictionId, Long userId);

    void deleteByPredictionId(Long predictionId);
}
