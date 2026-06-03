package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;

public interface SchemaRepository extends JpaRepository<Schema, Long> {
    List<Schema> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    Optional<Schema> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByNameAndOrganizationId(String name, Long organizationId);
}
