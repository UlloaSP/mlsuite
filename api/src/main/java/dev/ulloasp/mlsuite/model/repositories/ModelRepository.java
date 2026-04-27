/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.model.entities.Model;

@Repository
public interface ModelRepository extends JpaRepository<Model, Long> {

    List<Model> findByOrganizationId(Long organizationId);

    @Query("SELECT m FROM Model m WHERE m.createdBy.id = :userId")
    List<Model> findByUserId(Long userId);

    List<Model> findTop10ByStorageObjectKeyIsNullOrderByIdAsc();

    boolean existsByNameAndOrganizationId(String name, Long organizationId);

    @Query("SELECT COUNT(m) > 0 FROM Model m WHERE m.name = :name AND m.createdBy.id = :userId")
    boolean existsByNameAndUserId(String name, Long userId);

    Optional<Model> findByIdAndOrganizationId(Long modelId, Long organizationId);

    @Query("SELECT m FROM Model m WHERE m.id = :modelId AND m.createdBy.id = :userId")
    Optional<Model> findByIdAndUserId(Long modelId, Long userId);

}
