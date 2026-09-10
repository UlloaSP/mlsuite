package dev.ulloasp.mlsuite.schema.application.service;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaWithInitialVersionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCreationUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class SchemaCreationService implements SchemaCreationUseCase {

    private final SchemaCatalogUseCase schemaCatalogUseCase;
    private final SchemaVersionUseCase schemaVersionUseCase;

    public SchemaCreationService(SchemaCatalogUseCase schemaCatalogUseCase,
            SchemaVersionUseCase schemaVersionUseCase) {
        this.schemaCatalogUseCase = schemaCatalogUseCase;
        this.schemaVersionUseCase = schemaVersionUseCase;
    }

    @Override
    public Schema createWithInitialVersion(Long userId, CreateSchemaWithInitialVersionRequest request) {
        Schema schema = schemaCatalogUseCase.createSchema(userId, request.schema());
        schemaVersionUseCase.createVersion(userId, schema.getId(), request.initialVersion());
        return schema;
    }
}
