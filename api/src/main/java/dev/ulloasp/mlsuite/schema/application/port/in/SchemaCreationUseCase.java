package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaWithInitialVersionRequest;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;

public interface SchemaCreationUseCase {
    Schema createWithInitialVersion(Long userId, CreateSchemaWithInitialVersionRequest request);
}
