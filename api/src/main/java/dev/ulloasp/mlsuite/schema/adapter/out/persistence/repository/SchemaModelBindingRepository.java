package dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;

public interface SchemaModelBindingRepository extends JpaRepository<SchemaModelBinding, Long> {
    List<SchemaModelBinding> findBySchemaVersionId(Long schemaVersionId);

    /** The snapshot's models in binding order, without loading any artifact. */
    @Query("""
            SELECT new dev.ulloasp.mlsuite.schema.domain.model.BoundModel(
                b.model.id, b.model.name, b.model.modelSizeBytes)
            FROM SchemaModelBinding b
            WHERE b.schemaVersion.id = :schemaVersionId
            ORDER BY b.id
            """)
    List<BoundModel> findBoundModels(Long schemaVersionId);

    List<SchemaModelBinding> findBySchemaVersionIdIn(Collection<Long> schemaVersionIds);

    @Query("""
            SELECT b FROM SchemaModelBinding b
            WHERE b.schemaVersion.id = :schemaVersionId
            AND b.model.id = :modelId
            """)
    Optional<SchemaModelBinding> findBinding(Long schemaVersionId, Long modelId);

    boolean existsByModelId(Long modelId);

    long countBySchemaVersionId(Long schemaVersionId);
}
