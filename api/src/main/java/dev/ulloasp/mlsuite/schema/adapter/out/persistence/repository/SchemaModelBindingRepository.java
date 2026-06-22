package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;

public interface SchemaModelBindingRepository extends JpaRepository<SchemaModelBinding, Long> {
    List<SchemaModelBinding> findBySchemaVersionId(Long schemaVersionId);

    @Query("""
            SELECT b FROM SchemaModelBinding b
            WHERE b.schemaVersion.id = :schemaVersionId
            AND b.model.id = :modelId
            """)
    Optional<SchemaModelBinding> findBinding(Long schemaVersionId, Long modelId);
}
