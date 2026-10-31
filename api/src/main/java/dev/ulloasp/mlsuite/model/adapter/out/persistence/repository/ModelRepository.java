/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.application.runtime.RunnableModel;

@Repository
public interface ModelRepository extends JpaRepository<Model, Long> {

    List<Model> findByOrganizationId(Long organizationId);

    /** The artifact's SHA-256 alone, without loading the model. */
    @Query("SELECT m.artifactSha256 FROM Model m WHERE m.id = :id")
    Optional<String> findArtifactSha256(Long id);

    @Query("""
            SELECT new dev.ulloasp.mlsuite.model.application.runtime.RunnableModel(
                m.id, m.fileName, m.storageBucket, m.storageObjectKey, m.storageVersionId,
                m.modelSizeBytes, m.artifactSha256, m.environmentKey, m.runtimeState)
            FROM Model m
            WHERE m.id = :id
            """)
    Optional<RunnableModel> findRunnableModel(Long id);

    @Query("""
            SELECT new dev.ulloasp.mlsuite.model.application.runtime.RunnableModel(
                m.id, m.fileName, m.storageBucket, m.storageObjectKey, m.storageVersionId,
                m.modelSizeBytes, m.artifactSha256, m.environmentKey, m.runtimeState)
            FROM Model m
            WHERE m.id = :id AND m.organization.id = :organizationId
            """)
    Optional<RunnableModel> findRunnableModel(Long id, Long organizationId);

    boolean existsByEnvironmentKey(String environmentKey);

    List<Model> findByOrganizationIdAndArchivedAtIsNull(Long organizationId);

    @Query("""
            SELECT m FROM Model m
            WHERE m.organization.id = :organizationId
            AND m.archivedAt IS NULL
            AND (
                lower(m.name) LIKE lower(concat('%', :search, '%'))
                OR lower(m.type) LIKE lower(concat('%', :search, '%'))
                OR lower(m.specificType) LIKE lower(concat('%', :search, '%'))
                OR lower(m.fileName) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<Model> searchByOrganizationId(Long organizationId, String search, Pageable pageable);

    @Query("""
            SELECT m FROM Model m
            WHERE m.organization.id = :organizationId
            AND (:includeArchived = true OR m.archivedAt IS NULL)
            AND (:archivedOnly = false OR m.archivedAt IS NOT NULL)
            AND (
                :search = ''
                OR lower(m.name) LIKE lower(concat('%', :search, '%'))
                OR lower(m.type) LIKE lower(concat('%', :search, '%'))
                OR lower(m.specificType) LIKE lower(concat('%', :search, '%'))
                OR lower(m.fileName) LIKE lower(concat('%', :search, '%'))
            )
            """)
    Page<Model> findCatalogPage(
            Long organizationId,
            String search,
            boolean includeArchived,
            boolean archivedOnly,
            Pageable pageable);

    boolean existsByStorageBucketAndStorageObjectKey(String storageBucket, String storageObjectKey);

    boolean existsByNameAndOrganizationId(String name, Long organizationId);

    boolean existsByNameAndOrganizationIdAndIdNot(String name, Long organizationId, Long id);


    Optional<Model> findByIdAndOrganizationId(Long modelId, Long organizationId);

    long countByOrganizationId(Long organizationId);

}
