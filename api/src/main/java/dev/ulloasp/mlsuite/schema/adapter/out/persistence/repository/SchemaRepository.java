package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;

public interface SchemaRepository extends JpaRepository<Schema, Long> {
    List<Schema> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    List<Schema> findByOrganizationIdAndArchivedAtIsNullOrderByCreatedAtDesc(Long organizationId);

    @Query("""
            SELECT s FROM Schema s
            WHERE s.organization.id = :organizationId
            AND s.archivedAt IS NULL
            AND (
                lower(s.name) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(s.description, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<Schema> searchByOrganizationId(Long organizationId, String search, Pageable pageable);

    @Query("""
            SELECT s FROM Schema s
            WHERE s.organization.id = :organizationId
            AND (:includeArchived = true OR s.archivedAt IS NULL)
            AND (:archivedOnly = false OR s.archivedAt IS NOT NULL)
            AND (
                :search = ''
                OR lower(s.name) LIKE lower(concat('%', :search, '%'))
                OR lower(s.description) LIKE lower(concat('%', :search, '%'))
            )
            """)
    Page<Schema> findCatalogPage(
            Long organizationId,
            String search,
            boolean includeArchived,
            boolean archivedOnly,
            Pageable pageable);

    Optional<Schema> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByNameAndOrganizationId(String name, Long organizationId);

    boolean existsByNameAndOrganizationIdAndIdNot(String name, Long organizationId, Long id);

    long countByOrganizationId(Long organizationId);
}
