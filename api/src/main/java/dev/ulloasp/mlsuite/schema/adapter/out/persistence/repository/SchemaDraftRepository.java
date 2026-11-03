package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;

public interface SchemaDraftRepository
        extends JpaRepository<SchemaDraft, Long>, JpaSpecificationExecutor<SchemaDraft> {
    void deleteBySchemaId(Long schemaId);

    /** The drafts that started from a snapshot or became it, published ones included. */
    @Query("SELECT d FROM SchemaDraft d WHERE d.baseVersion.id = :versionId OR d.publishedVersion.id = :versionId")
    List<SchemaDraft> findByVersion(Long versionId);

    List<SchemaDraft> findBySchemaIdAndStatusNotOrderByUpdatedAtDesc(
            Long schemaId, SchemaDraftStatus status);

    @Query("SELECT d FROM SchemaDraft d WHERE d.id = :id AND d.schema.organization.id = :organizationId")
    Optional<SchemaDraft> findByIdAndOrganizationId(Long id, Long organizationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM SchemaDraft d WHERE d.id = :id AND d.schema.organization.id = :organizationId")
    Optional<SchemaDraft> findForUpdate(Long id, Long organizationId);
}
