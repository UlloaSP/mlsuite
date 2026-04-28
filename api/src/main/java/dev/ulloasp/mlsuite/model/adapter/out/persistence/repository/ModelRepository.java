/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.model.domain.model.Model;

@Repository
public interface ModelRepository extends JpaRepository<Model, Long> {

    List<Model> findByUserId(Long userId);

    List<Model> findByOrganizationId(Long organizationId);

    List<Model> findByUserIdAndOrganizationIdIsNull(Long userId);

    List<Model> findTop10ByStorageObjectKeyIsNullOrderByIdAsc();

    boolean existsByNameAndUserId(String name, Long userId);

    boolean existsByNameAndOrganizationId(String name, Long organizationId);

    Optional<Model> findByIdAndUserId(Long modelId, Long userId);

    Optional<Model> findByIdAndOrganizationId(Long modelId, Long organizationId);

}

