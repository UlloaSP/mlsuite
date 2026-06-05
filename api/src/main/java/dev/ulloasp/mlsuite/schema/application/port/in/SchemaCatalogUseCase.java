package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;

public interface SchemaCatalogUseCase {
    Schema createSchema(Long userId, CreateSchemaRequest request);

    List<Schema> listSchemas(Long userId);

    Schema getSchema(Long userId, Long schemaId);
}
