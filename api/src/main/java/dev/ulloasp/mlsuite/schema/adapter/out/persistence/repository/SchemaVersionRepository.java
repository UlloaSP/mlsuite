package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

public interface SchemaVersionRepository extends JpaRepository<SchemaVersion, Long> {
    interface LatestSchemaVersion {
        Long getSchemaId();

        int getLatestVersion();
    }

    @Query("""
            SELECT sv.schema.id AS schemaId, MAX(sv.version) AS latestVersion
            FROM SchemaVersion sv
            WHERE sv.schema.organization.id = :organizationId
            GROUP BY sv.schema.id
            """)
    List<LatestSchemaVersion> findLatestVersions(Long organizationId);

    List<SchemaVersion> findBySchemaIdOrderByVersionDesc(Long schemaId);

    Optional<SchemaVersion> findTopBySchemaIdOrderByVersionDesc(Long schemaId);

    @Query("SELECT sv FROM SchemaVersion sv WHERE sv.id = :id AND sv.schema.organization.id = :organizationId")
    Optional<SchemaVersion> findByIdAndOrganizationId(Long id, Long organizationId);

    @Query("SELECT COALESCE(MAX(sv.version), 0) FROM SchemaVersion sv WHERE sv.schema.id = :schemaId")
    int findMaxVersionBySchemaId(Long schemaId);

    @Query("""
            SELECT sv FROM SchemaVersion sv
            WHERE sv.schema.organization.id = :organizationId
            AND sv.schema.archivedAt IS NULL
            AND (
                lower(coalesce(sv.name, '')) LIKE lower(concat('%', :search, '%'))
                OR lower(sv.schema.name) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<SchemaVersion> searchByOrganizationId(Long organizationId, String search, Pageable pageable);
}
