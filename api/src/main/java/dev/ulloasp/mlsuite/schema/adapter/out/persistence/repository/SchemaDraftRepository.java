package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;

public interface SchemaDraftRepository extends JpaRepository<SchemaDraft, Long> {
    List<SchemaDraft> findBySchemaIdAndStatusNotOrderByUpdatedAtDesc(
            Long schemaId, SchemaDraftStatus status);

    @Query("SELECT d FROM SchemaDraft d WHERE d.id = :id AND d.schema.organization.id = :organizationId")
    Optional<SchemaDraft> findByIdAndOrganizationId(Long id, Long organizationId);
}
