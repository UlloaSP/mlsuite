package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaPageDto;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;

public interface SchemaCatalogUseCase {
    Schema createSchema(Long userId, CreateSchemaRequest request);

    List<Schema> listSchemas(Long userId);

    SchemaPageDto getSchemaPage(Long userId, int page, int size, String search, String sort, String status);

    Schema getSchema(Long userId, Long schemaId);

    Schema renameSchema(Long userId, Long schemaId, String name);

    Schema archiveSchema(Long userId, Long schemaId);

    Schema duplicateSchema(Long userId, Long schemaId, String name);

    void deleteSchema(Long userId, Long schemaId);
}
