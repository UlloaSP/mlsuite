package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

public interface SchemaBookmarkRepository extends JpaRepository<SchemaBookmark, Long> {
    void deleteBySchemaId(Long schemaId);
    List<SchemaBookmark> findBySchemaIdOrderByNameAsc(Long schemaId);

    Optional<SchemaBookmark> findBySchemaIdAndName(Long schemaId, String name);

    @Query("SELECT b FROM SchemaBookmark b WHERE b.id = :id AND b.schema.organization.id = :organizationId")
    Optional<SchemaBookmark> findByIdAndOrganizationId(Long id, Long organizationId);

    @Query("""
            SELECT b FROM SchemaBookmark b
            WHERE b.schema.organization.id = :organizationId
            AND b.schema.archivedAt IS NULL
            AND (
                lower(b.name) LIKE lower(concat('%', :search, '%'))
                OR lower(b.schema.name) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(b.version.name, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<SchemaBookmark> searchByOrganizationId(Long organizationId, String search, Pageable pageable);
}
