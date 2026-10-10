package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

public interface SchemaVersionRepository extends JpaRepository<SchemaVersion, Long> {
    /**
     * The snapshots of one schema that pass a filter and a search, in PostgreSQL's own SQL: the
     * search text counts the fields of the stored form that are not hidden, which JPQL cannot read.
     */
    String SNAPSHOTS = """
            FROM schema_version sv
            WHERE sv.schema_id = :schemaId
            AND (
                :filter = 'all'
                OR (:filter = 'latest' AND sv.version_number = (
                    SELECT max(latest.version_number) FROM schema_version latest
                    WHERE latest.schema_id = :schemaId
                ))
                OR (:filter = 'withBindings' AND EXISTS (
                    SELECT 1 FROM schema_model_binding binding WHERE binding.schema_version_id = sv.id
                ))
            )
            AND lower(concat_ws(' ', sv.name, sv.id, 'v' || sv.version_number, (
                SELECT count(*) FROM jsonb_array_elements(
                    CASE WHEN jsonb_typeof(sv.form_schema_json -> 'fields') = 'array'
                        THEN sv.form_schema_json -> 'fields' ELSE CAST('[]' AS jsonb) END) AS field
                WHERE jsonb_typeof(field) = 'object'
                AND field -> 'hidden' IS DISTINCT FROM CAST('true' AS jsonb)
            ) || ' fields')) LIKE :search ESCAPE '!'
            """;

    String SNAPSHOT_ORDER = """
            ORDER BY
                CASE WHEN :sort = 'name'
                    THEN lower(coalesce(nullif(btrim(sv.name), ''), 'v' || sv.version_number)) END ASC,
                CASE WHEN :sort = 'version' THEN sv.version_number END DESC,
                CASE WHEN :sort NOT IN ('name', 'version') THEN sv.created_at END DESC,
                sv.id ASC
            """;

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

    /**
     * One page of a schema's snapshots. {@code filter} is "all", "latest" or "withBindings"; any other
     * matches nothing. {@code sort} is "name", "version" or creation time, newest first. The search
     * reads what a snapshot card shows, including how many fields its form leaves visible.
     */
    @Query(value = "SELECT sv.* " + SNAPSHOTS + SNAPSHOT_ORDER,
            countQuery = "SELECT count(*) " + SNAPSHOTS,
            nativeQuery = true)
    Page<SchemaVersion> findSnapshotPage(Long schemaId, String filter, String search, String sort,
            Pageable pageable);

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
