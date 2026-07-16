package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

public interface SchemaBookmarkRepository extends JpaRepository<SchemaBookmark, Long> {
    List<SchemaBookmark> findBySchemaIdOrderByNameAsc(Long schemaId);

    Optional<SchemaBookmark> findBySchemaIdAndName(Long schemaId, String name);

    @Query("SELECT b FROM SchemaBookmark b WHERE b.id = :id AND b.schema.organization.id = :organizationId")
    Optional<SchemaBookmark> findByIdAndOrganizationId(Long id, Long organizationId);
}
