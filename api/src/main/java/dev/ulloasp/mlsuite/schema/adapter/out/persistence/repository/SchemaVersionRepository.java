package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

public interface SchemaVersionRepository extends JpaRepository<SchemaVersion, Long> {
    List<SchemaVersion> findBySchemaIdOrderByVersionDesc(Long schemaId);

    @Query("SELECT sv FROM SchemaVersion sv WHERE sv.id = :id AND sv.schema.organization.id = :organizationId")
    Optional<SchemaVersion> findByIdAndOrganizationId(Long id, Long organizationId);

    @Query("SELECT COALESCE(MAX(sv.version), 0) FROM SchemaVersion sv WHERE sv.schema.id = :schemaId")
    int findMaxVersionBySchemaId(Long schemaId);
}
